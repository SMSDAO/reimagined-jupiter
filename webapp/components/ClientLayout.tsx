'use client';

import { WalletContextProvider } from "@/lib/wallet-context-provider";
import Navigation from "@/components/Navigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletContextProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-green-900 font-sans">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </WalletContextProvider>
  );
}
