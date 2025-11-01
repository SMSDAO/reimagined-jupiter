'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';

interface DeploymentResult {
  mintAddress: string;
  tokenAccount: string;
  signature: string;
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  supply: string;
  isMintable: boolean;
  isFreezeable: boolean;
  tokenProgram: string;
}

export default function LaunchpadPage() {
  const { publicKey, signTransaction } = useWallet();
  
  // Token Configuration
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [decimals, setDecimals] = useState(9);
  const [totalSupply, setTotalSupply] = useState('1000000');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  // Advanced Features
  const [network, setNetwork] = useState<'mainnet' | 'devnet'>('devnet');
  const [isMintable, setIsMintable] = useState(false);
  const [revokeMintAuthority, setRevokeMintAuthority] = useState(true);
  const [isFreezeable, setIsFreezeable] = useState(false);
  const [revokeFreezeAuthority, setRevokeFreezeAuthority] = useState(true);
  const [tokenProgram, setTokenProgram] = useState<'spl' | 'token2022'>('spl');
  
  // Social Links
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  
  // UI State
  const [airdropPercent, setAirdropPercent] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const deploymentCost = network === 'mainnet' ? 0.002 : 0;

  const getConnection = () => {
    if (network === 'mainnet') {
      return new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    }
    return new Connection(clusterApiUrl('devnet'), 'confirmed');
  };

  const deployToken = async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!tokenName || !tokenSymbol) {
      alert('Please fill in token name and symbol!');
      return;
    }

    setDeploying(true);
    try {
      const conn = getConnection();
      const mintKeypair = Keypair.generate();
      const programId = tokenProgram === 'token2022' ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
      
      // Get rent exemption amount
      const lamports = await getMinimumBalanceForRentExemptMint(conn);
      
      // Create mint account
      const createAccountIx = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId,
      });
      
      // Initialize mint
      const initializeMintIx = createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        publicKey, // mint authority
        isFreezeable ? publicKey : null, // freeze authority
        programId
      );
      
      // Get associated token account
      const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey,
        false,
        programId
      );
      
      // Create associated token account
      const createATAIx = createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAccount,
        publicKey,
        mintKeypair.publicKey,
        programId
      );
      
      // Mint initial supply
      const supplyAmount = BigInt(parseFloat(totalSupply) * Math.pow(10, decimals));
      const mintToIx = createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAccount,
        publicKey,
        supplyAmount,
        [],
        programId
      );
      
      // Build transaction
      const transaction = new Transaction().add(
        createAccountIx,
        initializeMintIx,
        createATAIx,
        mintToIx
      );
      
      // Revoke authorities if requested
      if (!isMintable && revokeMintAuthority) {
        const revokeMintIx = createSetAuthorityInstruction(
          mintKeypair.publicKey,
          publicKey,
          AuthorityType.MintTokens,
          null,
          [],
          programId
        );
        transaction.add(revokeMintIx);
      }
      
      if (isFreezeable && revokeFreezeAuthority) {
        const revokeFreezeIx = createSetAuthorityInstruction(
          mintKeypair.publicKey,
          publicKey,
          AuthorityType.FreezeAccount,
          null,
          [],
          programId
        );
        transaction.add(revokeFreezeIx);
      }
      
      // Get recent blockhash
      transaction.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;
      
      // Sign with mint keypair
      transaction.partialSign(mintKeypair);
      
      // Sign with wallet
      const signedTx = await signTransaction(transaction);
      
      // Send transaction
      const signature = await conn.sendRawTransaction(signedTx.serialize());
      
      // Confirm transaction
      await conn.confirmTransaction(signature, 'confirmed');
      
      // Save deployment info
      const result: DeploymentResult = {
        mintAddress: mintKeypair.publicKey.toBase58(),
        tokenAccount: associatedTokenAccount.toBase58(),
        signature,
        tokenName,
        tokenSymbol,
        decimals,
        supply: totalSupply,
        isMintable: isMintable && !revokeMintAuthority,
        isFreezeable: isFreezeable && !revokeFreezeAuthority,
        tokenProgram: tokenProgram === 'token2022' ? 'Token-2022' : 'SPL Token',
      };
      
      setDeploymentResult(result);
      
      // Save to localStorage
      const savedDeployments = JSON.parse(localStorage.getItem('tokenDeployments') || '[]');
      savedDeployments.unshift({
        ...result,
        timestamp: new Date().toISOString(),
        network,
      });
      localStorage.setItem('tokenDeployments', JSON.stringify(savedDeployments.slice(0, 10)));
      
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Deployment error:', error);
      alert(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeploying(false);
    }
  };

  const spinRoulette = () => {
    setSpinning(true);
    setTimeout(() => {
      setSpinning(false);
      const reward = Math.floor(Math.random() * 1000) + 100;
      alert(`🎉 You won ${reward} ${tokenSymbol || 'tokens'}!`);
    }, 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  const downloadTokenInfo = () => {
    if (!deploymentResult) return;
    
    const data = {
      ...deploymentResult,
      network,
      timestamp: new Date().toISOString(),
      description,
      logoUrl,
      socialLinks: { website, twitter, telegram },
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tokenSymbol}-${network}-deployment.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getExplorerUrl = (type: 'tx' | 'address', value: string) => {
    const cluster = network === 'mainnet' ? '' : `?cluster=${network}`;
    if (type === 'tx') {
      return `https://solscan.io/tx/${value}${cluster}`;
    }
    return `https://solscan.io/token/${value}${cluster}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-cyan-400 to-green-400 bg-clip-text text-transparent animate-pulse">
            🚀 Token Launchpad
          </h1>
          <p className="text-gray-300 text-lg">
            Launch your Solana token with advanced features and instant deployment
          </p>
        </div>

        {/* Network Selector */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={() => setNetwork('devnet')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              network === 'devnet'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            🧪 Devnet (Free Testing)
          </button>
          <button
            onClick={() => setNetwork('mainnet')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              network === 'mainnet'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            🔴 Mainnet Beta (Production)
          </button>
        </div>

        {/* Mainnet Warning */}
        {network === 'mainnet' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md border border-orange-500/50 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-white font-bold mb-1">Mainnet Deployment</h3>
                <p className="text-gray-300 text-sm">
                  You are deploying to Solana Mainnet Beta. This will cost real SOL (~{deploymentCost} SOL). 
                  Make sure you have reviewed all settings carefully.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Token Configuration Panel */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-purple-500/30 shadow-lg shadow-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📝</span> Token Configuration
            </h2>
            
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="text-white text-sm mb-2 block font-semibold">Token Name *</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="My Awesome Token"
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-cyan-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block font-semibold">Token Symbol *</label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  placeholder="MAT"
                  maxLength={10}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-cyan-500 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm mb-2 block font-semibold">Decimals</label>
                  <input
                    type="number"
                    value={decimals}
                    onChange={(e) => setDecimals(Math.min(9, Math.max(0, parseInt(e.target.value) || 0)))}
                    min="0"
                    max="9"
                    className="w-full bg-white/10 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-cyan-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-white text-sm mb-2 block font-semibold">Total Supply *</label>
                  <input
                    type="number"
                    value={totalSupply}
                    onChange={(e) => setTotalSupply(e.target.value)}
                    className="w-full bg-white/10 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-cyan-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-white text-sm mb-2 block font-semibold">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your token..."
                  rows={2}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-cyan-500 focus:outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block font-semibold">Logo URL (Optional)</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-cyan-500 focus:outline-none transition"
                />
              </div>

              {/* Advanced Features */}
              <div className="border-t border-purple-500/30 pt-4 mt-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <span>⚙️</span> Advanced Features
                </h3>

                {/* Token Program */}
                <div className="mb-4">
                  <label className="text-white text-sm mb-2 block font-semibold">Token Program</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTokenProgram('spl')}
                      className={`p-3 rounded-lg font-medium transition-all ${
                        tokenProgram === 'spl'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      SPL Token
                    </button>
                    <button
                      onClick={() => setTokenProgram('token2022')}
                      className={`p-3 rounded-lg font-medium transition-all ${
                        tokenProgram === 'token2022'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      Token-2022
                    </button>
                  </div>
                </div>

                {/* Mintable Control */}
                <div className="bg-blue-900/20 rounded-lg p-4 mb-3 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white font-semibold flex items-center gap-2">
                      <span>🔄</span> Mintable
                    </label>
                    <button
                      onClick={() => setIsMintable(!isMintable)}
                      className={`w-14 h-7 rounded-full transition-all ${
                        isMintable ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        isMintable ? 'translate-x-8' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <p className="text-gray-300 text-xs mb-2">
                    Allow minting additional tokens after deployment
                  </p>
                  {isMintable && (
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={revokeMintAuthority}
                        onChange={(e) => setRevokeMintAuthority(e.target.checked)}
                        className="w-4 h-4"
                      />
                      Revoke mint authority after initial supply
                    </label>
                  )}
                </div>

                {/* Freeze Authority */}
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white font-semibold flex items-center gap-2">
                      <span>❄️</span> Freezeable
                    </label>
                    <button
                      onClick={() => setIsFreezeable(!isFreezeable)}
                      className={`w-14 h-7 rounded-full transition-all ${
                        isFreezeable ? 'bg-cyan-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        isFreezeable ? 'translate-x-8' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <p className="text-gray-300 text-xs mb-2">
                    Enable account freezing capability
                  </p>
                  {isFreezeable && (
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={revokeFreezeAuthority}
                        onChange={(e) => setRevokeFreezeAuthority(e.target.checked)}
                        className="w-4 h-4"
                      />
                      Revoke freeze authority after launch
                    </label>
                  )}
                </div>
              </div>

              {/* Social Links */}
              <div className="border-t border-purple-500/30 pt-4 mt-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <span>🔗</span> Social Links (Optional)
                </h3>
                <div className="space-y-3">
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Website URL"
                    className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-purple-500/30 focus:border-cyan-500 focus:outline-none transition text-sm"
                  />
                  <input
                    type="url"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="Twitter URL"
                    className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-purple-500/30 focus:border-cyan-500 focus:outline-none transition text-sm"
                  />
                  <input
                    type="url"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="Telegram URL"
                    className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-purple-500/30 focus:border-cyan-500 focus:outline-none transition text-sm"
                  />
                </div>
              </div>

              {/* Deployment Cost */}
              <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-lg p-4 border border-purple-500/50">
                <div className="flex justify-between text-white mb-2">
                  <span className="font-semibold">Deployment Cost:</span>
                  <span className="font-bold text-xl">
                    {deploymentCost === 0 ? 'FREE' : `${deploymentCost} SOL`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-300 text-sm">
                  <span>Network:</span>
                  <span className="capitalize">{network}</span>
                </div>
              </div>

              {/* Deploy Button */}
              <button
                onClick={deployToken}
                disabled={!publicKey || !tokenName || !tokenSymbol || deploying}
                className="w-full bg-gradient-to-r from-purple-600 via-cyan-600 to-green-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {deploying ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Deploying...
                  </span>
                ) : !publicKey ? (
                  'Connect Wallet First'
                ) : (
                  `🚀 Deploy Token ${deploymentCost > 0 ? `(${deploymentCost} SOL)` : '(FREE)'}`
                )}
              </button>
            </div>
          </div>

          {/* 3D Roulette Game */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-green-500/30 shadow-lg shadow-green-500/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>🎰</span> Airdrop Roulette
            </h2>
            
            <div className="relative">
              {/* Roulette Wheel Visualization */}
              <div className="aspect-square bg-gradient-to-br from-purple-900 via-blue-900 to-green-900 rounded-full flex items-center justify-center relative overflow-hidden shadow-xl shadow-purple-500/30">
                <motion.div
                  animate={spinning ? { rotate: 360 } : {}}
                  transition={{ duration: 3, ease: "easeInOut", repeat: spinning ? Infinity : 0 }}
                  className="absolute inset-0"
                  style={{
                    background: 'conic-gradient(from 0deg, #9333ea, #ec4899, #3b82f6, #10b981, #eab308, #ef4444, #9333ea)',
                  }}
                />
                <div className="relative z-10 bg-black/70 backdrop-blur-sm rounded-full w-3/4 h-3/4 flex flex-col items-center justify-center border-4 border-purple-500/50">
                  <div className="text-white text-5xl font-bold mb-2">🎁</div>
                  <div className="text-white text-xl font-bold">
                    {spinning ? 'Spinning...' : 'Spin to Win!'}
                  </div>
                </div>
              </div>

              {/* Airdrop Allocation */}
              <div className="mt-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg p-4 border border-green-500/50">
                <label className="text-white text-sm mb-3 block font-semibold">
                  Airdrop Allocation: {airdropPercent}%
                </label>
                <input
                  type="range"
                  value={airdropPercent}
                  onChange={(e) => setAirdropPercent(parseInt(e.target.value))}
                  min="1"
                  max="50"
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-gray-300 text-sm mt-2">
                  <span>For Circulation: {(parseFloat(totalSupply || '0') * (100 - airdropPercent) / 100).toLocaleString()}</span>
                  <span>For Roulette: {(parseFloat(totalSupply || '0') * airdropPercent / 100).toLocaleString()}</span>
                </div>
              </div>

              {/* Prize Tiers */}
              <div className="mt-6 space-y-3">
                <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-3 text-white shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">🥇 Grand Prize</span>
                    <span className="font-bold">10,000 tokens</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-3 text-white shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">🥈 Big Win</span>
                    <span className="font-bold">5,000 tokens</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-3 text-white shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">🥉 Good Win</span>
                    <span className="font-bold">1,000 tokens</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-3 text-white shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">🎯 Small Win</span>
                    <span className="font-bold">100 tokens</span>
                  </div>
                </div>
              </div>

              <button
                onClick={spinRoulette}
                disabled={spinning || !tokenSymbol}
                className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {spinning ? '🎰 Spinning...' : '🎰 Spin Roulette'}
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center border border-purple-500/30 hover:border-purple-500 transition-all hover:shadow-lg hover:shadow-purple-500/30">
            <div className="text-4xl mb-2">🌐</div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-Network</h3>
            <p className="text-gray-300 text-sm">Mainnet & Devnet support</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center border border-cyan-500/30 hover:border-cyan-500 transition-all hover:shadow-lg hover:shadow-cyan-500/30">
            <div className="text-4xl mb-2">🎨</div>
            <h3 className="text-xl font-bold text-white mb-2">Advanced Features</h3>
            <p className="text-gray-300 text-sm">Freeze, Mint, Token-2022</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center border border-green-500/30 hover:border-green-500 transition-all hover:shadow-lg hover:shadow-green-500/30">
            <div className="text-4xl mb-2">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">Instant Deploy</h3>
            <p className="text-gray-300 text-sm">One-click deployment</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center border border-pink-500/30 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/30">
            <div className="text-4xl mb-2">🔒</div>
            <h3 className="text-xl font-bold text-white mb-2">Production Ready</h3>
            <p className="text-gray-300 text-sm">Full SPL Token support</p>
          </div>
        </div>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccessModal && deploymentResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowSuccessModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-br from-purple-900/90 to-green-900/90 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full border-2 border-green-500/50 shadow-2xl shadow-green-500/50"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Success Header */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="text-6xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Token Deployed Successfully!
                  </h2>
                  <p className="text-gray-300">
                    {deploymentResult.tokenName} ({deploymentResult.tokenSymbol})
                  </p>
                </div>

                {/* Token Info Grid */}
                <div className="space-y-4 mb-6">
                  {/* Mint Address */}
                  <div className="bg-black/30 rounded-lg p-4 border border-purple-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm font-semibold">Mint Address</span>
                      <button
                        onClick={() => copyToClipboard(deploymentResult.mintAddress, 'Mint Address')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition"
                      >
                        {copyFeedback === 'Mint Address' ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    <p className="text-white font-mono text-sm break-all">
                      {deploymentResult.mintAddress}
                    </p>
                  </div>

                  {/* Token Account */}
                  <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm font-semibold">Token Account</span>
                      <button
                        onClick={() => copyToClipboard(deploymentResult.tokenAccount, 'Token Account')}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded text-sm transition"
                      >
                        {copyFeedback === 'Token Account' ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    <p className="text-white font-mono text-sm break-all">
                      {deploymentResult.tokenAccount}
                    </p>
                  </div>

                  {/* Transaction Signature */}
                  <div className="bg-black/30 rounded-lg p-4 border border-green-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm font-semibold">Transaction Signature</span>
                      <button
                        onClick={() => copyToClipboard(deploymentResult.signature, 'Transaction Signature')}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition"
                      >
                        {copyFeedback === 'Transaction Signature' ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    <p className="text-white font-mono text-sm break-all">
                      {deploymentResult.signature}
                    </p>
                  </div>

                  {/* Token Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 rounded-lg p-3 border border-purple-500/30">
                      <span className="text-gray-400 text-xs">Total Supply</span>
                      <p className="text-white font-bold">
                        {parseFloat(deploymentResult.supply).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-purple-500/30">
                      <span className="text-gray-400 text-xs">Decimals</span>
                      <p className="text-white font-bold">{deploymentResult.decimals}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex gap-2 flex-wrap">
                    {deploymentResult.isMintable && (
                      <span className="bg-green-600/30 border border-green-500 text-green-200 px-3 py-1 rounded-full text-sm">
                        🔄 Mintable
                      </span>
                    )}
                    {deploymentResult.isFreezeable && (
                      <span className="bg-cyan-600/30 border border-cyan-500 text-cyan-200 px-3 py-1 rounded-full text-sm">
                        ❄️ Freezeable
                      </span>
                    )}
                    <span className="bg-purple-600/30 border border-purple-500 text-purple-200 px-3 py-1 rounded-full text-sm">
                      {deploymentResult.tokenProgram}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <a
                    href={getExplorerUrl('tx', deploymentResult.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-xl transition text-center"
                  >
                    🔍 View on Explorer
                  </a>
                  <button
                    onClick={downloadTokenInfo}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl transition"
                  >
                    💾 Download Info
                  </button>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl transition"
                  >
                    ✖️ Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
