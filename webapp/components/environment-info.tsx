'use client';

import { useEffect, useState } from 'react';
import { getEnvironmentInfo, logEnvironmentConfig } from '@/lib/config/api-endpoints';

interface EnvironmentInfoData {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isVercel: boolean;
  jupiterQuoteApi: string;
  jupiterPriceApi: string;
  primaryRPC: string;
  pythHermes: string;
  validation: {
    valid: boolean;
    missing: string[];
  };
}

export function EnvironmentInfo() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfoData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Initialize environment info
    const initializeEnvInfo = () => {
      const info = getEnvironmentInfo();
      setEnvInfo(info);
      
      // Log configuration on mount
      logEnvironmentConfig();
    };
    
    initializeEnvInfo();
  }, []);

  if (!envInfo) {
    return null;
  }

  const statusColor = envInfo.validation.valid ? 'text-green-400' : 'text-yellow-400';
  const statusIcon = envInfo.validation.valid ? '✅' : '⚠️';

  return (
    <div className="rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{statusIcon}</div>
          <div>
            <h3 className="text-xl font-bold text-white">Environment Configuration</h3>
            <p className="text-sm text-gray-400">
              {envInfo.isProduction ? 'Production' : 'Development'} mode
              {envInfo.isVercel && ' • Vercel Platform'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Validation Status */}
      <div className={`mb-4 p-3 rounded-lg bg-black/30 ${statusColor}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Configuration Status:</span>
          <span>{envInfo.validation.valid ? 'Valid' : 'Incomplete'}</span>
        </div>
        {envInfo.validation.missing.length > 0 && (
          <div className="mt-2 text-sm">
            <span className="text-yellow-400">Missing variables:</span>
            <ul className="mt-1 ml-4 list-disc">
              {envInfo.validation.missing.map((variable) => (
                <li key={variable}>{variable}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Detailed Information */}
      {isExpanded && (
        <div className="space-y-3">
          {/* Environment */}
          <div className="p-3 rounded-lg bg-black/30">
            <div className="text-sm text-gray-400 mb-1">Environment</div>
            <div className="text-white font-mono text-sm">{envInfo.nodeEnv}</div>
          </div>

          {/* RPC Endpoint */}
          <div className="p-3 rounded-lg bg-black/30">
            <div className="text-sm text-gray-400 mb-1">Primary RPC Endpoint</div>
            <div className="text-white font-mono text-xs break-all">{envInfo.primaryRPC}</div>
            {envInfo.primaryRPC.includes('mainnet-beta.solana.com') && (
              <div className="mt-2 text-xs text-yellow-400">
                ⚠️ Using public RPC. Consider upgrading to Helius or QuickNode for better performance.
              </div>
            )}
          </div>

          {/* Jupiter APIs */}
          <div className="p-3 rounded-lg bg-black/30">
            <div className="text-sm text-gray-400 mb-2">Jupiter APIs</div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-400">Quote:</span>{' '}
                <span className="text-white font-mono">{envInfo.jupiterQuoteApi}</span>
              </div>
              <div>
                <span className="text-gray-400">Price:</span>{' '}
                <span className="text-white font-mono">{envInfo.jupiterPriceApi}</span>
              </div>
            </div>
          </div>

          {/* Pyth Network */}
          <div className="p-3 rounded-lg bg-black/30">
            <div className="text-sm text-gray-400 mb-1">Pyth Network</div>
            <div className="text-white font-mono text-xs break-all">{envInfo.pythHermes}</div>
          </div>

          {/* Platform Info */}
          <div className="p-3 rounded-lg bg-black/30">
            <div className="text-sm text-gray-400 mb-2">Platform Information</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Production Mode:</span>
                <span className={envInfo.isProduction ? 'text-green-400' : 'text-yellow-400'}>
                  {envInfo.isProduction ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vercel Platform:</span>
                <span className={envInfo.isVercel ? 'text-green-400' : 'text-gray-400'}>
                  {envInfo.isVercel ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {!envInfo.validation.valid && (
            <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/20">
              <div className="text-sm font-semibold text-yellow-400 mb-2">
                ⚠️ Configuration Recommendations
              </div>
              <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
                <li>Set up premium RPC provider (Helius or QuickNode) for better performance</li>
                <li>Configure WalletConnect Project ID for wallet connections</li>
                <li>Consider adding fallback RPC endpoints for redundancy</li>
              </ul>
            </div>
          )}

          {envInfo.isProduction && envInfo.validation.valid && (
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/20">
              <div className="text-sm font-semibold text-green-400 mb-2">
                ✅ Production Ready
              </div>
              <p className="text-xs text-green-200">
                Your environment is properly configured for production use.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Console Log Info */}
      <div className="mt-4 text-xs text-gray-500">
        💡 Check browser console for detailed configuration logs
      </div>
    </div>
  );
}
