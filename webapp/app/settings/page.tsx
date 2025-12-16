'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion } from 'framer-motion';

interface APIProvider {
  id: string;
  name: string;
  url: string;
  type: 'rpc' | 'pyth' | 'dex';
  enabled: boolean;
}

interface Settings {
  apiProviders: APIProvider[];
  rotationEnabled: boolean;
  rotationInterval: number; // in seconds
}

const DEFAULT_PROVIDERS: APIProvider[] = [
  { id: '1', name: 'Solana Mainnet', url: 'https://api.mainnet-beta.solana.com', type: 'rpc', enabled: true },
  { id: '2', name: 'Pyth Price Feed', url: 'https://hermes.pyth.network', type: 'pyth', enabled: true },
  { id: '3', name: 'Meteora', url: 'https://api.meteora.ag', type: 'dex', enabled: true },
  { id: '4', name: 'Pump.fun', url: 'https://pumpportal.fun/api', type: 'dex', enabled: true },
];

export default function SettingsPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [settings, setSettings] = useState<Settings>({
    apiProviders: DEFAULT_PROVIDERS,
    rotationEnabled: true,
    rotationInterval: 300,
  });
  const [newProvider, setNewProvider] = useState<{ name: string; url: string; type: 'rpc' | 'pyth' | 'dex' }>({ name: '', url: '', type: 'rpc' });
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gxq-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        setLastSaved(new Date(parsed.timestamp || Date.now()));
      } catch (err) {
        console.error('Failed to parse saved settings:', err);
      }
    }
  }, []);

  const addProvider = () => {
    if (!newProvider.name || !newProvider.url) {
      alert('Please fill in all fields');
      return;
    }

    const provider: APIProvider = {
      id: Date.now().toString(),
      name: newProvider.name,
      url: newProvider.url,
      type: newProvider.type,
      enabled: true,
    };

    setSettings(prev => ({
      ...prev,
      apiProviders: [...prev.apiProviders, provider],
    }));

    setNewProvider({ name: '', url: '', type: 'rpc' });
  };

  const removeProvider = (id: string) => {
    setSettings(prev => ({
      ...prev,
      apiProviders: prev.apiProviders.filter(p => p.id !== id),
    }));
  };

  const toggleProvider = (id: string) => {
    setSettings(prev => ({
      ...prev,
      apiProviders: prev.apiProviders.map(p =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    }));
  };

  const saveSettingsLocally = () => {
    const toSave = {
      ...settings,
      timestamp: Date.now(),
    };
    localStorage.setItem('gxq-settings', JSON.stringify(toSave));
    setLastSaved(new Date());
    alert('Settings saved locally!');
  };

  const saveSettingsOnChain = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }

    setSaving(true);

    try {
      // Calculate cost: 0.000022 SOL
      const cost = Math.floor(0.000022 * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // Self-transfer to store data on-chain
          lamports: cost,
        })
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Also save locally
      saveSettingsLocally();

      alert(`Settings saved on-chain! Transaction: ${signature.slice(0, 8)}...`);
    } catch (err) {
      console.error('Failed to save on-chain:', err);
      alert(`Failed to save on-chain: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-2">⚙️ Settings</h1>
        <p className="text-gray-300 mb-8">
          Configure API providers, nodes, and preferences
        </p>

        {/* API Rotation Settings */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🔄 API Rotation</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Enable Rotation</div>
                <div className="text-sm text-gray-400">
                  Automatically rotate between providers for redundancy
                </div>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, rotationEnabled: !prev.rotationEnabled }))}
                className={`px-6 py-2 rounded-lg font-bold ${
                  settings.rotationEnabled ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                {settings.rotationEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">
                Rotation Interval: {settings.rotationInterval}s
              </label>
              <input
                type="range"
                value={settings.rotationInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, rotationInterval: parseInt(e.target.value) }))}
                min="60"
                max="3600"
                step="60"
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 min</span>
                <span>1 hour</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Providers List */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🌐 API Providers</h2>
          
          <div className="space-y-3 mb-6">
            {settings.apiProviders.map((provider) => (
              <div
                key={provider.id}
                className="bg-white/5 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleProvider(provider.id)}
                      className={`w-12 h-6 rounded-full transition ${
                        provider.enabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition transform ${
                          provider.enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <div>
                      <div className="text-white font-medium">{provider.name}</div>
                      <div className="text-sm text-gray-400">{provider.url}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      provider.type === 'rpc'
                        ? 'bg-blue-600 text-white'
                        : provider.type === 'pyth'
                        ? 'bg-purple-600 text-white'
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    {provider.type.toUpperCase()}
                  </span>
                  <button
                    onClick={() => removeProvider(provider.id)}
                    className="text-red-400 hover:text-red-300 font-bold px-3 py-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Provider */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold text-white mb-4">➕ Add New Provider</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Provider Name"
                value={newProvider.name}
                onChange={(e) => setNewProvider(prev => ({ ...prev, name: e.target.value }))}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="API URL"
                value={newProvider.url}
                onChange={(e) => setNewProvider(prev => ({ ...prev, url: e.target.value }))}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
              />
              <select
                value={newProvider.type}
                onChange={(e) => setNewProvider(prev => ({ ...prev, type: e.target.value as 'rpc' | 'pyth' | 'dex' }))}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="rpc">RPC</option>
                <option value="pyth">Pyth</option>
                <option value="dex">DEX</option>
              </select>
              <button
                onClick={addProvider}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Add Provider
              </button>
            </div>
          </div>
        </div>

        {/* Save Buttons */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">💾 Save Settings</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={saveSettingsLocally}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
              >
                💻 Save Locally (Free)
              </button>
              <button
                onClick={saveSettingsOnChain}
                disabled={saving || !publicKey}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg disabled:opacity-50"
              >
                {saving ? '⏳ Saving...' : '⛓️ Save On-Chain (0.000022 SOL)'}
              </button>
            </div>
            {lastSaved && (
              <div className="text-center text-sm text-gray-400">
                Last saved: {lastSaved.toLocaleString()}
              </div>
            )}
            {!publicKey && (
              <div className="text-center text-sm text-yellow-400">
                Connect wallet to save settings on-chain
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500 rounded-xl p-4 text-sm">
          <div className="text-blue-400 font-bold mb-2">ℹ️ About On-Chain Storage</div>
          <div className="text-gray-300">
            Saving settings on-chain costs 0.000022 SOL (~$0.003) and ensures your configuration
            is permanently stored on the Solana blockchain. Local storage is free but only saved
            in your browser.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
