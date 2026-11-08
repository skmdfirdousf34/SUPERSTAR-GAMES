"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../lib/api";

export interface Wallet {
  id: string;
  balance: number; // Real Cash (withdrawable)
  bonusBalance?: number; // Bonus Cash
  totalBalance?: number;
  totalDeposit: number;
  totalWithdraw: number;
}

export interface User {
  id: string;
  phone: string;
  role: "USER" | "ADMIN" | "STAFF_DEPOSIT" | "STAFF_WITHDRAWAL" | "STAFF" | string;
  referralCode: string;
  wallet: Wallet;
  hasSecurityPin?: boolean;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  loginWithOtp: (phone: string, otp: string) => Promise<User>;
  sendOtp: (
    phone: string,
    type: "REGISTER" | "LOGIN" | "RESET_PASSWORD"
  ) => Promise<{ message: string; otpPreview?: string }>;
  register: (phone: string, password: string, referralCode?: string, otp?: string) => Promise<void>;
  resetPassword: (phone: string, otp: string, newPassword: string) => Promise<string>;
  setSecurityPin: (newPin: string, currentPin?: string) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously restore session from localStorage ONLY if BOTH token AND user exist
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedToken = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");
        if (savedToken && savedUser) {
          return JSON.parse(savedUser);
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("token");
    }
    return true;
  });

  const fetchProfile = async () => {
    try {
      const data = await apiRequest<{ user: User }>("/auth/me");
      if (data?.user) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 404) {
        console.warn("Session expired or unauthorized (401/404): logging out");
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
        setToken(null);
        setUser(null);
      } else {
        console.warn("Backend validation delayed or network glitch; preserving 48h cached session:", err?.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (savedToken) {
      setToken(savedToken);
      fetchProfile();
    } else {
      // If no token exists, immediately clear any stale cached user
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
      }
      setLoading(false);
    }
  }, []);

  const login = async (phone: string, password: string): Promise<User> => {
    const res = await apiRequest<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
    }
    setToken(res.token);
    setUser(res.user);
    setLoading(false);
    return res.user;
  };

  const loginWithOtp = async (phone: string, otp: string): Promise<User> => {
    const res = await apiRequest<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
    }
    setToken(res.token);
    setUser(res.user);
    setLoading(false);
    return res.user;
  };

  const sendOtp = async (
    phone: string,
    type: "REGISTER" | "LOGIN" | "RESET_PASSWORD"
  ) => {
    return await apiRequest<{ message: string; otpPreview?: string }>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone, type }),
    });
  };

  const register = async (
    phone: string,
    password: string,
    referralCode?: string,
    otp?: string
  ) => {
    const res = await apiRequest<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ phone, password, referralCode, otp }),
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
    }
    setToken(res.token);
    setUser(res.user);
    setLoading(false);
  };

  const resetPassword = async (phone: string, otp: string, newPassword: string) => {
    const res = await apiRequest<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ phone, otp, newPassword }),
    });
    return res.message;
  };

  const setSecurityPin = async (newPin: string, currentPin?: string) => {
    const res = await apiRequest<{ message: string }>("/auth/security-pin", {
      method: "POST",
      body: JSON.stringify({ newPin, currentPin }),
    });
    if (user) {
      const updatedUser = { ...user, hasSecurityPin: true };
      setUser(updatedUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    }
    return res.message;
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const savedToken = (typeof window !== "undefined" ? localStorage.getItem("token") : null) || token;
    if (savedToken) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithOtp,
        sendOtp,
        register,
        resetPassword,
        setSecurityPin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
