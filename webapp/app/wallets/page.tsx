'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

/**
 * Wallet Management Page
 * Create, import, export, and manage sub-wallets for arbitrage
 */

interface SubWallet {
  id: string;
  publicKey: string;
  walletName: string;
  walletIndex: number;
  isActive: boolean;
  lastBalanceSol: number;
  totalTrades: number;
  totalProfitSol: number;
  currentBalance?: number;
  sufficientBalance?: boolean;
}

// Device fingerprinting (simple implementation)
function getDeviceFingerprint(): string {
  const { userAgent, language, platform } = navigator;
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const timezoneOffset = new Date().getTimezoneOffset();
  
  const fingerprint = `${userAgent}-${language}-${platform}-${screenResolution}-${timezoneOffset}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

export default function WalletsPage() {
  const { publicKey, signMessage } = useWallet();
  const [wallets, setWallets] = useState<SubWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<SubWallet | null>(null);
  const [walletName, setWalletName] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [exportedKey, setExportedKey] = useState('');
  const [error, setError] = useState('');

  // Authenticate wallet on mount
  useEffect(() => {
    if (publicKey && signMessage && !authToken) {
      authenticateWallet();
    }
  }, [publicKey, signMessage, authToken]);

  // Load wallets after authentication
  useEffect(() => {
    if (authToken) {
      loadWallets();
    }
  }, [authToken]);

  // Authenticate wallet with signature
  const authenticateWallet = async () => {
    if (!publicKey || !signMessage) return;

    try {
      setLoading(true);
      setError('');

      // Create message to sign
      const message = `Sign this message to authenticate with GXQ Studio.\n\nWallet: ${publicKey.toString()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);
      
      // Request signature
      const signature = await signMessage(messageBytes);
      
      // Convert signature to base58
      const bs58 = (await import('bs58')).default;
      const signatureBase58 = bs58.encode(signature);
      
      // Send to API
      const response = await fetch('/api/wallet/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': getDeviceFingerprint(),
        },
        body: JSON.stringify({
          publicKey: publicKey.toString(),
          signature: signatureBase58,
          message,
          deviceFingerprint: getDeviceFingerprint(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAuthToken(data.token);
        console.log('✅ Authenticated successfully');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Load wallets
  const loadWallets = async () => {
    if (!authToken) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/wallet/manage?includeBalances=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Device-Fingerprint': getDeviceFingerprint(),
        },
      });

      const data = await response.json();

      if (data.success) {
        setWallets(data.wallets);
      } else {
        setError(data.error || 'Failed to load wallets');
      }
    } catch (err) {
      console.error('Load wallets error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  // Create wallet
  const createWallet = async () => {
    if (!authToken) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/wallet/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Device-Fingerprint': getDeviceFingerprint(),
        },
        body: JSON.stringify({
          action: 'create',
          walletName: walletName || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Sub-wallet created successfully!\n\nPublic Key: ${data.subWallet.publicKey}`);
        setShowCreateModal(false);
        setWalletName('');
        await loadWallets();
      } else {
        setError(data.error || 'Failed to create wallet');
      }
    } catch (err) {
      console.error('Create wallet error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  // Import wallet
  const importWallet = async () => {
    if (!authToken || !privateKey) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/wallet/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Device-Fingerprint': getDeviceFingerprint(),
        },
        body: JSON.stringify({
          action: 'import',
          privateKey,
          walletName: walletName || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Sub-wallet imported successfully!\n\nPublic Key: ${data.subWallet.publicKey}`);
        setShowImportModal(false);
        setWalletName('');
        setPrivateKey('');
        await loadWallets();
      } else {
        setError(data.error || 'Failed to import wallet');
      }
    } catch (err) {
      console.error('Import wallet error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  // Export wallet
  const exportWallet = async (wallet: SubWallet) => {
    if (!authToken) return;

    const confirmed = confirm(
      `⚠️ WARNING: You are about to export the private key for:\n\n${wallet.walletName}\n${wallet.publicKey}\n\nNEVER share your private key with anyone!\n\nDo you want to continue?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/wallet/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Device-Fingerprint': getDeviceFingerprint(),
        },
        body: JSON.stringify({
          action: 'export',
          subWalletPublicKey: wallet.publicKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExportedKey(data.privateKey);
        setSelectedWallet(wallet);
        setShowExportModal(true);
      } else {
        setError(data.error || 'Failed to export wallet');
      }
    } catch (err) {
      console.error('Export wallet error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export wallet');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
  };

  // Check balance
  const checkBalance = async (wallet: SubWallet) => {
    if (!authToken) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/wallet/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Device-Fingerprint': getDeviceFingerprint(),
        },
        body: JSON.stringify({
          action: 'check_balance',
          subWalletPublicKey: wallet.publicKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Balance: ${data.balance.toFixed(9)} SOL\n${data.sufficientBalance ? '✅ Sufficient for trading' : '⚠️ Insufficient balance'}`);
        await loadWallets();
      } else {
        setError(data.error || 'Failed to check balance');
      }
    } catch (err) {
      console.error('Check balance error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check balance');
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-white mb-6">Wallet Management</h1>
            <p className="text-gray-300 mb-8">Connect your wallet to manage sub-wallets for arbitrage</p>
            <WalletMultiButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Wallet Management</h1>
            <p className="text-gray-300">Manage your arbitrage sub-wallets</p>
          </div>
          <WalletMultiButton />
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={loading || wallets.length >= 3}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➕ Create New Wallet
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            disabled={loading || wallets.length >= 3}
            className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Import Wallet
          </button>
          <button
            onClick={loadWallets}
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-lg transition-all disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Wallet list */}
        <div className="grid grid-cols-1 gap-6">
          {loading && wallets.length === 0 ? (
            <div className="text-center py-20 text-white">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              <p className="mt-4">Loading wallets...</p>
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-xl">No sub-wallets yet</p>
              <p className="mt-2">Create or import a wallet to get started</p>
            </div>
          ) : (
            wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{wallet.walletName}</h3>
                    <p className="text-gray-400 text-sm font-mono">{wallet.publicKey}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => checkBalance(wallet)}
                      disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                    >
                      💰 Check Balance
                    </button>
                    <button
                      onClick={() => exportWallet(wallet)}
                      disabled={loading}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                    >
                      📤 Export
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Balance</p>
                    <p className="text-white font-semibold">
                      {wallet.currentBalance !== undefined ? `${wallet.currentBalance.toFixed(4)} SOL` : `${wallet.lastBalanceSol.toFixed(4)} SOL`}
                    </p>
                    {wallet.sufficientBalance === false && (
                      <p className="text-red-400 text-xs mt-1">⚠️ Insufficient</p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Trades</p>
                    <p className="text-white font-semibold">{wallet.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Profit</p>
                    <p className="text-green-400 font-semibold">{wallet.totalProfitSol.toFixed(4)} SOL</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className={`font-semibold ${wallet.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {wallet.isActive ? '✅ Active' : '❌ Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {wallets.length > 0 && (
          <div className="mt-6 text-center text-gray-400 text-sm">
            {wallets.length} / 3 sub-wallets used
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-4">Create Sub-Wallet</h2>
              <p className="text-gray-400 mb-4">
                A new wallet with a public key ending in "GXQ" will be generated for you.
              </p>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Wallet name (optional)"
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-4">
                <button
                  onClick={createWallet}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setWalletName('');
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-4">Import Sub-Wallet</h2>
              <p className="text-gray-400 mb-4">
                Import an existing wallet. The public key must end with "GXQ".
              </p>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Wallet name (optional)"
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Private key (base58)"
                rows={3}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <div className="flex gap-4">
                <button
                  onClick={importWallet}
                  disabled={loading || !privateKey}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import'}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setWalletName('');
                    setPrivateKey('');
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && selectedWallet && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full">
              <h2 className="text-2xl font-bold text-red-400 mb-4">⚠️ Private Key Export</h2>
              <p className="text-gray-400 mb-2">
                <strong className="text-white">{selectedWallet.walletName}</strong>
              </p>
              <p className="text-gray-400 mb-4 font-mono text-sm">{selectedWallet.publicKey}</p>
              <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-4">
                <p className="font-semibold mb-2">⚠️ SECURITY WARNING</p>
                <p className="text-sm">Never share your private key with anyone! Anyone with access to this key can control your wallet and steal your funds.</p>
              </div>
              <div className="relative mb-4">
                <textarea
                  value={exportedKey}
                  readOnly
                  rows={4}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg font-mono text-sm focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(exportedKey)}
                  className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  📋 Copy
                </button>
              </div>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportedKey('');
                  setSelectedWallet(null);
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
