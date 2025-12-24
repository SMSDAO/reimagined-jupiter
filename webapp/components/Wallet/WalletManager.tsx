'use client';

/**
 * WalletManager Component
 * Handles ephemeral wallet generation and import
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  generateWallet,
  importWalletFromPrivateKey,
  validatePrivateKeyFormat,
} from '@/lib/wallet-utils';
import {
  saveEncryptedWallet,
  loadEncryptedWallet,
  hasEncryptedWallet,
  getEncryptedWalletMetadata,
  deleteEncryptedWallet,
} from '@/lib/storage';

export default function WalletManager() {
  const [mode, setMode] = useState<'none' | 'generate' | 'import'>('none');
  const [password, setPassword] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [generatedWallet, setGeneratedWallet] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletStored, setWalletStored] = useState(hasEncryptedWallet());

  const handleGenerate = () => {
    try {
      setError('');
      const wallet = generateWallet();
      setGeneratedWallet({
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
      });
      setMode('generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate wallet');
    }
  };

  const handleSaveWallet = async () => {
    if (!generatedWallet || !password) {
      setError('Password required to encrypt wallet');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await saveEncryptedWallet(
        generatedWallet.privateKey,
        generatedWallet.publicKey,
        password,
        'ephemeral'
      );
      setWalletStored(true);
      setPassword('');
      alert('✅ Wallet encrypted and saved securely!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!privateKeyInput || !password) {
      setError('Private key and password are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate format first
      const validation = validatePrivateKeyFormat(privateKeyInput);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Import wallet
      const imported = importWalletFromPrivateKey(privateKeyInput);

      // Save encrypted
      await saveEncryptedWallet(
        privateKeyInput,
        imported.publicKey,
        password,
        'imported'
      );

      setWalletStored(true);
      setPrivateKeyInput('');
      setPassword('');
      alert(`✅ Wallet imported successfully!\nAddress: ${imported.publicKey}`);
      setMode('none');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadWallet = async () => {
    if (!password) {
      setError('Password required to decrypt wallet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const wallet = await loadEncryptedWallet(password);
      if (wallet) {
        alert(`✅ Wallet loaded successfully!\nAddress: ${wallet.publicKey}`);
        setPassword('');
      }
    } catch (err) {
      setError('Failed to decrypt wallet. Invalid password?');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = () => {
    if (confirm('⚠️ Are you sure you want to delete your stored wallet? This cannot be undone!')) {
      deleteEncryptedWallet();
      setWalletStored(false);
      setGeneratedWallet(null);
      alert('🗑️ Wallet deleted from storage');
    }
  };

  const metadata = getEncryptedWalletMetadata();

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">🔐 Wallet Manager</h3>

      {walletStored && metadata && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400 text-xl">✅</span>
            <span className="text-white font-semibold">Wallet Stored</span>
          </div>
          <div className="text-sm text-gray-300 space-y-1">
            <p>
              <span className="font-semibold">Address:</span> {metadata.publicKey.slice(0, 8)}...
              {metadata.publicKey.slice(-8)}
            </p>
            <p>
              <span className="font-semibold">Type:</span> {metadata.type}
            </p>
            <p>
              <span className="font-semibold">Created:</span>{' '}
              {new Date(metadata.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password to decrypt"
              className="flex-1 bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-green-500 outline-none text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLoadWallet}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all text-sm"
            >
              Load
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteWallet}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all text-sm"
            >
              Delete
            </motion.button>
          </div>
        </div>
      )}

      {!walletStored && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg"
            >
              🎲 Generate New
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode('import')}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg"
            >
              📥 Import Existing
            </motion.button>
          </div>

          <AnimatePresence>
            {generatedWallet && mode === 'generate' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-4 space-y-3"
              >
                <div>
                  <p className="text-white font-semibold mb-1">Public Address:</p>
                  <p className="text-sm text-gray-300 break-all bg-black/30 p-2 rounded">
                    {generatedWallet.publicKey}
                  </p>
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">Private Key:</p>
                  <p className="text-sm text-gray-300 break-all bg-black/30 p-2 rounded">
                    {generatedWallet.privateKey}
                  </p>
                  <p className="text-xs text-yellow-400 mt-1">
                    ⚠️ Save this securely! It will be encrypted with your password.
                  </p>
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to encrypt (min 8 chars)"
                    className="w-full bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-purple-500 outline-none text-sm mb-2"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveWallet}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all"
                  >
                    {loading ? 'Encrypting...' : '🔒 Encrypt & Save'}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {mode === 'import' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 space-y-3"
              >
                <div>
                  <p className="text-white font-semibold mb-1">Private Key:</p>
                  <textarea
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    placeholder="Enter private key (base58 or [byte array])"
                    className="w-full bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500 outline-none text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">Encryption Password:</p>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 8 chars)"
                    className="w-full bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleImport}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
                >
                  {loading ? 'Importing...' : '📥 Import & Encrypt'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </div>
      )}

      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-xs text-yellow-400">
          🔒 <strong>Security Notes:</strong> All wallets are encrypted with AES-256-GCM before storage.
          Your password never leaves your browser. Store your password securely - it cannot be recovered!
        </p>
      </div>
    </div>
  );
}
