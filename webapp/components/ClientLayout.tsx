"use client";

import { useEffect } from "react";
import { WalletContextProvider } from "@/lib/wallet-context-provider";
import { ThemeProvider } from "@/lib/theme-context";
import Navigation from "@/components/Navigation";
import { startAPIHealthMonitoring } from "@/lib/config";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize API health monitoring on client side
  useEffect(() => {
    // Start health checks every 60 seconds
    startAPIHealthMonitoring(60000);

    // Log initialization
    console.log("[GXQ Studio] API health monitoring started");

    // Cleanup is handled by the health checker itself
  }, []);

  return (
    <ThemeProvider>
      <WalletContextProvider>
        <div className="min-h-screen font-sans transition-colors duration-300">
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-900 via-blue-900 to-green-900 dark:from-purple-950 dark:via-blue-950 dark:to-green-950" />
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-transparent via-transparent to-transparent dark:from-black/40 dark:via-black/20 dark:to-black/40" />
          <Navigation />
          <main className="container mx-auto px-4 py-8 relative">
            {children}
          </main>
        </div>
      </WalletContextProvider>
    </ThemeProvider>
  );
}
