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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const data = await apiRequest<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch (err) {
      console.warn("Session expired or unauthorized");
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (phone: string, password: string): Promise<User> => {
    const res = await apiRequest<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });

    localStorage.setItem("token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const loginWithOtp = async (phone: string, otp: string): Promise<User> => {
    const res = await apiRequest<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });

    localStorage.setItem("token", res.token);
    setToken(res.token);
    setUser(res.user);
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

    localStorage.setItem("token", res.token);
    setToken(res.token);
    setUser(res.user);
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
      setUser({ ...user, hasSecurityPin: true });
    }
    return res.message;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
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
