'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/swap', label: 'Swap' },
    { href: '/ticker', label: 'Prices' },
    { href: '/arbitrage', label: 'Arbitrage' },
    { href: '/sniper', label: 'Sniper' },
    { href: '/launchpad', label: 'Launchpad' },
    { href: '/airdrop', label: 'Airdrop' },
    { href: '/staking', label: 'Staking' },
    { href: '/wallet-analysis', label: 'Wallet Analysis' },
  ];

  return (
    <nav className="bg-black/30 backdrop-blur-md border-b border-purple-500/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              GXQ Studio
            </Link>
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-purple-600/50 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}
