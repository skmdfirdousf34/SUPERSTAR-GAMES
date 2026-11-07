import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";
import { MobileContainer } from "../components/MobileContainer";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";

export const metadata: Metadata = {
  title: "Superstar Club - Color Prediction & Aviator",
  description: "Superstar Club - The #1 Online Gaming Platform with Win Go Color Prediction and Aviator Crash Games.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 min-h-screen">
        <AuthProvider>
          <SocketProvider>
            <MobileContainer>
              <Header />
              <main className="flex-1 pb-20">{children}</main>
              <BottomNav />
            </MobileContainer>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
