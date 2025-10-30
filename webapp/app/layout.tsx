import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "GXQ Studio - Advanced Solana DeFi Platform | Flash Loan Arbitrage, Token Launchpad, Jupiter Swap",
  description: "The most advanced Solana DeFi platform with flash loan arbitrage, MEV-protected sniper bot, token launchpad with airdrop roulette game, Jupiter swap integration, NFT staking, and comprehensive API for developers. Build on GXQ Studio's ecosystem with real-time pricing, dynamic slippage, and multi-DEX aggregation.",
  openGraph: {
    title: "GXQ Studio - Advanced Solana DeFi Platform",
    description: "Flash loan arbitrage, sniper bot, token launchpad with airdrop roulette",
    type: "website",
    url: "https://jup-nine.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "GXQ Studio - Advanced Solana DeFi Platform",
    description: "Flash loan arbitrage, sniper bot, token launchpad with airdrop roulette",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="keywords" content="Solana DeFi, Flash Loan Arbitrage, Jupiter Swap, Token Launchpad, Sniper Bot, Pump.fun, Raydium, GXQ Studio, Airdrop Game, MEV Protection, Solana Trading, DeFi API, NFT Staking, Crypto Arbitrage, Solana Ecosystem" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
