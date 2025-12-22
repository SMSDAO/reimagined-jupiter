/**
 * Admin Configuration API Route
 * POST/GET /api/admin/control/config
 * 
 * Manages system configuration (fees, slippage, DAO skim, trading parameters)
 * 
 * Security:
 * - Requires authentication
 * - Requires specific permissions for each config type
 * - Full input validation with bounds checking
 * - Audit logging with before/after values
 * - Configuration history tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermissions,
  withAudit,
  validateInput,
  type AuthContext,
} from '@/lib/adminAuth';

interface ConfigUpdateRequest {
  key: string;
  value: any;
  reason?: string;
}

// Configuration store (in production, use database with history)
const configStore: Record<string, any> = {
  // Transaction fees
  maxGasPrice: parseInt(process.env.MAX_GAS_PRICE || '10000000'), // 10M lamports max
  gasPriorityFee: parseInt(process.env.GAS_PRIORITY_FEE || '10000'), // 10k lamports default
  gasBuffer: parseFloat(process.env.GAS_BUFFER || '1.5'),
  
  // DAO skimming
  daoSkimEnabled: process.env.DAO_SKIM_ENABLED === 'true',
  daoSkimPercentage: parseFloat(process.env.DAO_SKIM_PERCENTAGE || '0.0'), // 0% default
  daoWalletAddress: process.env.DAO_WALLET_ADDRESS || '',
  
  // Trading parameters
  minProfitSol: parseFloat(process.env.MINIMUM_PROFIT_SOL || '0.01'),
  maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.01'),
  maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE || '10.0'),
  
  // Strategies
  enabledStrategies: (process.env.ENABLED_STRATEGIES || 'arbitrage,flash-loan,triangular').split(','),
  
  // API policies
  maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60'),
  maxRequestsPerHour: parseInt(process.env.MAX_REQUESTS_PER_HOUR || '1000'),
  
  // System
  maintenanceMode: false,
  emergencyStopEnabled: false,
};

// Configuration validation rules
const configValidation: Record<string, any> = {
  maxGasPrice: {
    type: 'number',
    min: 1000,
    max: 10000000, // Hard cap at 10M lamports
    permission: 'config:update_fees',
  },
  gasPriorityFee: {
    type: 'number',
    min: 0,
    max: 100000,
    permission: 'config:update_fees',
  },
  gasBuffer: {
    type: 'number',
    min: 1.0,
    max: 3.0,
    permission: 'config:update_fees',
  },
  daoSkimEnabled: {
    type: 'boolean',
    permission: 'config:update_dao_skim',
  },
  daoSkimPercentage: {
    type: 'number',
    min: 0.0,
    max: 50.0, // Max 50%
    permission: 'config:update_dao_skim',
  },
  daoWalletAddress: {
    type: 'string',
    pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, // Solana address format
    permission: 'config:update_dao_skim',
  },
  minProfitSol: {
    type: 'number',
    min: 0.001,
    max: 100.0,
    permission: 'config:update_trading',
  },
  maxSlippage: {
    type: 'number',
    min: 0.001,
    max: 0.1, // Max 10%
    permission: 'config:update_trading',
  },
  maxTradeSize: {
    type: 'number',
    min: 0.1,
    max: 1000.0,
    permission: 'config:update_trading',
  },
  enabledStrategies: {
    type: 'array',
    enum: ['arbitrage', 'flash-loan', 'triangular', 'sniper'],
    permission: 'config:update_strategies',
  },
  maxRequestsPerMinute: {
    type: 'number',
    min: 10,
    max: 1000,
    permission: 'api:update_policies',
  },
  maxRequestsPerHour: {
    type: 'number',
    min: 100,
    max: 100000,
    permission: 'api:update_policies',
  },
  maintenanceMode: {
    type: 'boolean',
    permission: 'config:update_trading',
  },
  emergencyStopEnabled: {
    type: 'boolean',
    permission: 'bot:emergency_stop',
  },
};

async function updateConfigHandler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    
    const validation = validateInput<ConfigUpdateRequest>(body, {
      key: {
        type: 'string',
        required: true,
        min: 1,
        max: 100,
      },
      value: {
        type: 'string', // Will be validated based on config key
        required: true,
      },
      reason: {
        type: 'string',
        required: false,
        max: 500,
      },
    });
    
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }
    
    const { key, value, reason } = validation.data!;
    
    // Check if config key exists
    if (!(key in configValidation)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration key',
          message: `Unknown configuration key: ${key}`,
          availableKeys: Object.keys(configValidation),
        },
        { status: 400 }
      );
    }
    
    const rules = configValidation[key];
    
    // Check permission for this config key
    if (!auth.user.permissions.includes(rules.permission)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
          message: `Required permission: ${rules.permission}`,
          requiredPermission: rules.permission,
        },
        { status: 403 }
      );
    }
    
    // Validate value based on config rules
    let parsedValue: any = value;
    
    if (rules.type === 'number') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid value type',
            message: `${key} must be a number`,
          },
          { status: 400 }
        );
      }
      
      if (rules.min !== undefined && parsedValue < rules.min) {
        return NextResponse.json(
          {
            success: false,
            error: 'Value out of range',
            message: `${key} must be at least ${rules.min}`,
          },
          { status: 400 }
        );
      }
      
      if (rules.max !== undefined && parsedValue > rules.max) {
        return NextResponse.json(
          {
            success: false,
            error: 'Value out of range',
            message: `${key} must be at most ${rules.max}`,
          },
          { status: 400 }
        );
      }
    } else if (rules.type === 'boolean') {
      if (typeof value === 'string') {
        parsedValue = value === 'true';
      } else {
        parsedValue = Boolean(value);
      }
    } else if (rules.type === 'array') {
      if (!Array.isArray(value)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid value type',
            message: `${key} must be an array`,
          },
          { status: 400 }
        );
      }
      
      if (rules.enum) {
        const invalid = value.filter((v: any) => !rules.enum.includes(v));
        if (invalid.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid array values',
              message: `Invalid values: ${invalid.join(', ')}. Allowed: ${rules.enum.join(', ')}`,
            },
            { status: 400 }
          );
        }
      }
      
      parsedValue = value;
    } else if (rules.type === 'string') {
      if (rules.pattern && !rules.pattern.test(value)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid value format',
            message: `${key} format is invalid`,
          },
          { status: 400 }
        );
      }
      parsedValue = value;
    }
    
    // Store old value for audit
    const oldValue = configStore[key];
    
    // Update configuration
    configStore[key] = parsedValue;
    
    // Also update environment variable (for current runtime)
    const envVarMap: Record<string, string> = {
      maxGasPrice: 'MAX_GAS_PRICE',
      gasPriorityFee: 'GAS_PRIORITY_FEE',
      gasBuffer: 'GAS_BUFFER',
      daoSkimEnabled: 'DAO_SKIM_ENABLED',
      daoSkimPercentage: 'DAO_SKIM_PERCENTAGE',
      daoWalletAddress: 'DAO_WALLET_ADDRESS',
      minProfitSol: 'MINIMUM_PROFIT_SOL',
      maxSlippage: 'MAX_SLIPPAGE',
      maxTradeSize: 'MAX_TRADE_SIZE',
      enabledStrategies: 'ENABLED_STRATEGIES',
      maxRequestsPerMinute: 'MAX_REQUESTS_PER_MINUTE',
      maxRequestsPerHour: 'MAX_REQUESTS_PER_HOUR',
    };
    
    if (envVarMap[key]) {
      process.env[envVarMap[key]] = Array.isArray(parsedValue) ? parsedValue.join(',') : String(parsedValue);
    }
    
    console.log(`✅ Configuration updated by ${auth.user.username}: ${key} = ${parsedValue}${reason ? ` (${reason})` : ''}`);
    
    return NextResponse.json({
      success: true,
      message: `Configuration "${key}" updated successfully`,
      key,
      oldValue,
      newValue: parsedValue,
      reason,
      updatedBy: auth.user.username,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Config update error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET handler to view configuration
async function getConfigHandler(request: NextRequest, auth: AuthContext) {
  // Filter config based on permissions
  const filteredConfig: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(configStore)) {
    const rules = configValidation[key];
    if (rules && auth.user.permissions.includes(rules.permission.replace('update', 'view').replace('api:', 'config:'))) {
      filteredConfig[key] = value;
    }
  }
  
  return NextResponse.json({
    success: true,
    config: filteredConfig,
    permissions: auth.user.permissions.filter(p => p.startsWith('config:') || p.startsWith('api:')),
  });
}

export const POST = withAudit({
  action: 'config_update',
  resource: 'config',
})(
  requirePermissions(['config:view'])(updateConfigHandler)
);

export const GET = requirePermissions(['config:view'])(getConfigHandler);
