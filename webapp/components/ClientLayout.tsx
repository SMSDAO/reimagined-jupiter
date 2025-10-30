'use client';

import { WalletContextProvider } from "@/lib/wallet-context-provider";
import { ThemeProvider } from "@/lib/theme-context";
import Navigation from "@/components/Navigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
