import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "@/lib/wallet-context-provider";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "GXQ Studio - Advanced Solana DeFi Platform",
  description: "Flash loan arbitrage, sniper bot, token launchpad with airdrop roulette",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletContextProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-green-900 font-sans">
            <Navigation />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
