'use client';

import React, { FC, ReactNode, useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet as useWalletHook } from '@solana/wallet-adapter-react';
import '@solana/wallet-adapter-react-ui/styles.css';

// Wallet event listener component
const WalletEventDispatcher: FC = () => {
  const { publicKey, connected, connecting, disconnecting, wallet } = useWalletHook();

  useEffect(() => {
    if (connected && publicKey) {
      console.log('[Wallet] Connected:', {
        address: publicKey.toString(),
        wallet: wallet?.adapter.name,
      });
      
      // Dispatch wallet-connected event
      const event = new CustomEvent('wallet-connected', {
        detail: {
          publicKey: publicKey.toString(),
          walletName: wallet?.adapter.name,
          timestamp: new Date().toISOString(),
        },
      });
      window.dispatchEvent(event);
    }
  }, [connected, publicKey, wallet]);

  useEffect(() => {
    if (connecting) {
      console.log('[Wallet] Connecting to wallet...');
    }
  }, [connecting]);

  useEffect(() => {
    if (disconnecting) {
      console.log('[Wallet] Disconnecting from wallet...');
    }
  }, [disconnecting]);

  useEffect(() => {
    if (!connected && !connecting && !disconnecting) {
      console.log('[Wallet] Wallet disconnected - resetting state');
      
      // Dispatch wallet-disconnected event
      const event = new CustomEvent('wallet-disconnected', {
        detail: {
          timestamp: new Date().toISOString(),
        },
      });
      window.dispatchEvent(event);
    }
  }, [connected, connecting, disconnecting]);

  return null;
};

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletEventDispatcher />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
