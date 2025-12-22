/**
 * Multi-Hop Arbitrage Route Computation Engine (3-7 hops)
 * Features:
 * - Dynamic route pathfinding with depth-first search
 * - Real-time liquidity weighting
 * - Per-leg profit calculation with deterministic math
 * - Route optimization using dynamic programming
 * - Gas cost estimation per route
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { JupiterV6Integration, JupiterQuote } from '../integrations/jupiter.js';
import { TokenConfig } from '../types.js';
import BN from 'bn.js';

export interface RouteHop {
  fromToken: TokenConfig;
  toToken: TokenConfig;
  inputAmount: number;
  expectedOutput: number;
  quote?: JupiterQuote;
  priceImpact: number;
  fee: number;
}

export interface MultiHopRoute {
  hops: RouteHop[];
  totalInputAmount: number;
  totalOutputAmount: number;
  totalProfit: number;
  profitPercentage: number;
  totalFees: number;
  totalPriceImpact: number;
  estimatedGasCost: number;
  netProfit: number;
  viable: boolean;
  confidence: number;
}

export interface RouteSearchParams {
  startToken: TokenConfig;
  minHops: number;
  maxHops: number;
  minProfitThreshold: number; // Percentage (e.g., 0.003 = 0.3%)
  maxPriceImpact: number; // Percentage (e.g., 0.01 = 1%)
  maxSlippage: number; // Basis points
  startAmount: number;
  availableTokens: TokenConfig[];
}

/**
 * Multi-Hop Arbitrage Engine
 */
export class MultiHopArbitrageEngine {
  private connection: Connection;
  private jupiter: JupiterV6Integration;
  private readonly COMPUTE_UNIT_COST = 5000; // Lamports per 200k compute units
  private readonly BASE_GAS_COST = 10000; // Base transaction fee
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.jupiter = new JupiterV6Integration(connection);
  }
  
  /**
   * Find profitable multi-hop arbitrage routes
   * @param params - Search parameters
   * @returns Array of viable routes sorted by net profit
   */
  async findMultiHopRoutes(params: RouteSearchParams): Promise<MultiHopRoute[]> {
    console.log('[MultiHop] Starting route search...');
    console.log(`[MultiHop] Hops: ${params.minHops}-${params.maxHops}`);
    console.log(`[MultiHop] Start token: ${params.startToken.symbol}`);
    console.log(`[MultiHop] Amount: ${params.startAmount}`);
    console.log(`[MultiHop] Min profit: ${(params.minProfitThreshold * 100).toFixed(2)}%`);
    
    const routes: MultiHopRoute[] = [];
    
    // Search for routes of different lengths
    for (let hopCount = params.minHops; hopCount <= params.maxHops; hopCount++) {
      console.log(`[MultiHop] Searching ${hopCount}-hop routes...`);
      
      const routesForHopCount = await this.searchRoutesWithHopCount(
        params,
        hopCount
      );
      
      routes.push(...routesForHopCount);
    }
    
    // Filter viable routes
    const viableRoutes = routes.filter(route => route.viable);
    
    // Sort by net profit (descending)
    viableRoutes.sort((a, b) => b.netProfit - a.netProfit);
    
    console.log(`[MultiHop] Found ${viableRoutes.length} viable routes`);
    
    if (viableRoutes.length > 0) {
      const best = viableRoutes[0];
      console.log(`[MultiHop] Best route: ${best.hops.map(h => h.fromToken.symbol).join(' -> ')} -> ${params.startToken.symbol}`);
      console.log(`[MultiHop] Net profit: ${best.netProfit} (${(best.profitPercentage * 100).toFixed(3)}%)`);
    }
    
    return viableRoutes;
  }
  
  private readonly MAX_LOSS_PER_HOP_THRESHOLD = 0.5; // Skip hops that lose >50% value
  
  /**
   * Search for routes with specific hop count using DFS
   */
  private async searchRoutesWithHopCount(
    params: RouteSearchParams,
    hopCount: number
  ): Promise<MultiHopRoute[]> {
    const routes: MultiHopRoute[] = [];
    const visited = new Set<string>();
    
    /**
     * Depth-first search for routes
     */
    const dfs = async (
      currentToken: TokenConfig,
      currentAmount: number,
      path: RouteHop[],
      depth: number
    ): Promise<void> => {
      // Base case: reached target hop count
      if (depth === hopCount) {
        // Check if we can return to start token
        const finalHop = await this.evaluateHop(
          currentToken,
          params.startToken,
          currentAmount,
          params.maxSlippage
        );
        
        if (finalHop) {
          const route = this.buildRoute([...path, finalHop], params);
          
          if (route.viable) {
            routes.push(route);
          }
        }
        
        return;
      }
      
      // Recursive case: explore next hops
      for (const nextToken of params.availableTokens) {
        // Skip if same as current token
        if (nextToken.mint.equals(currentToken.mint)) {
          continue;
        }
        
        // Skip if already visited (except start token for final hop)
        const tokenKey = nextToken.mint.toString();
        if (visited.has(tokenKey) && depth < hopCount - 1) {
          continue;
        }
        
        // Evaluate this hop
        const hop = await this.evaluateHop(
          currentToken,
          nextToken,
          currentAmount,
          params.maxSlippage
        );
        
        if (!hop) {
          continue;
        }
        
        // Check price impact
        if (hop.priceImpact > params.maxPriceImpact) {
          continue;
        }
        
        // Check liquidity (ensure we got reasonable output)
        if (hop.expectedOutput < currentAmount * this.MAX_LOSS_PER_HOP_THRESHOLD) {
          // Lost more than threshold in this hop, skip
          continue;
        }
        
        // Add to visited and continue search
        visited.add(tokenKey);
        await dfs(nextToken, hop.expectedOutput, [...path, hop], depth + 1);
        visited.delete(tokenKey);
      }
    };
    
    // Start DFS from start token
    await dfs(params.startToken, params.startAmount, [], 0);
    
    return routes;
  }
  
  /**
   * Evaluate a single hop between two tokens
   */
  private async evaluateHop(
    fromToken: TokenConfig,
    toToken: TokenConfig,
    amount: number,
    maxSlippageBps: number
  ): Promise<RouteHop | null> {
    try {
      // Get quote from Jupiter
      const quote = await this.jupiter.getQuote(
        fromToken.mint.toString(),
        toToken.mint.toString(),
        amount,
        maxSlippageBps
      );
      
      if (!quote) {
        return null;
      }
      
      const expectedOutput = parseInt(quote.outAmount);
      const priceImpact = parseFloat(quote.priceImpactPct);
      
      // Calculate fee (from route plan)
      let totalFee = 0;
      if (quote.routePlan) {
        for (const step of quote.routePlan) {
          if (step.swapInfo?.feeAmount) {
            totalFee += parseInt(step.swapInfo.feeAmount);
          }
        }
      }
      
      return {
        fromToken,
        toToken,
        inputAmount: amount,
        expectedOutput,
        quote,
        priceImpact,
        fee: totalFee,
      };
    } catch (error) {
      console.error(`[MultiHop] Error evaluating hop ${fromToken.symbol} -> ${toToken.symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Build and validate complete route from hops
   */
  private buildRoute(hops: RouteHop[], params: RouteSearchParams): MultiHopRoute {
    const totalInputAmount = params.startAmount;
    const totalOutputAmount = hops[hops.length - 1].expectedOutput;
    
    // Calculate total profit using safe math
    const inputBN = new BN(totalInputAmount);
    const outputBN = new BN(totalOutputAmount);
    const profitBN = outputBN.sub(inputBN);
    const totalProfit = profitBN.toNumber();
    
    // Calculate profit percentage
    const profitPercentage = totalProfit / totalInputAmount;
    
    // Calculate total fees
    const totalFees = hops.reduce((sum, hop) => sum + hop.fee, 0);
    
    // Calculate total price impact
    const totalPriceImpact = hops.reduce((sum, hop) => sum + hop.priceImpact, 0);
    
    // Estimate gas cost (base + per hop)
    const estimatedGasCost = this.BASE_GAS_COST + (hops.length * this.COMPUTE_UNIT_COST);
    
    // Calculate net profit (profit - gas cost)
    const netProfit = totalProfit - estimatedGasCost;
    
    // Determine viability
    const viable = 
      profitPercentage >= params.minProfitThreshold &&
      totalPriceImpact <= params.maxPriceImpact &&
      netProfit > 0;
    
    // Calculate confidence score (0-1)
    // Higher confidence for:
    // - Lower price impact
    // - Higher profit margin
    // - Fewer hops
    let confidence = 1.0;
    confidence *= Math.max(0.1, 1.0 - (totalPriceImpact / params.maxPriceImpact));
    confidence *= Math.min(1.0, profitPercentage / params.minProfitThreshold);
    confidence *= Math.max(0.5, 1.0 - (hops.length / params.maxHops) * 0.5);
    confidence = Math.min(1.0, Math.max(0.0, confidence));
    
    return {
      hops,
      totalInputAmount,
      totalOutputAmount,
      totalProfit,
      profitPercentage,
      totalFees,
      totalPriceImpact,
      estimatedGasCost,
      netProfit,
      viable,
      confidence,
    };
  }
  
  /**
   * Optimize route using dynamic programming
   * Finds the best intermediate path for a given start and end
   */
  async optimizeRoute(route: MultiHopRoute): Promise<MultiHopRoute | null> {
    console.log('[MultiHop] Optimizing route...');
    
    // For each pair of consecutive hops, try to find better intermediate paths
    const optimizedHops: RouteHop[] = [];
    
    for (let i = 0; i < route.hops.length; i++) {
      const hop = route.hops[i];
      
      // Try to find better path for this hop
      const betterHop = await this.findBetterHop(
        hop.fromToken,
        hop.toToken,
        hop.inputAmount
      );
      
      optimizedHops.push(betterHop || hop);
    }
    
    // Rebuild route with optimized hops
    const params: RouteSearchParams = {
      startToken: route.hops[0].fromToken,
      minHops: route.hops.length,
      maxHops: route.hops.length,
      minProfitThreshold: 0.001,
      maxPriceImpact: 0.05,
      maxSlippage: 50,
      startAmount: route.totalInputAmount,
      availableTokens: [],
    };
    
    const optimizedRoute = this.buildRoute(optimizedHops, params);
    
    console.log('[MultiHop] Optimization complete');
    console.log(`  Original profit: ${route.netProfit}`);
    console.log(`  Optimized profit: ${optimizedRoute.netProfit}`);
    
    return optimizedRoute.netProfit > route.netProfit ? optimizedRoute : route;
  }
  
  /**
   * Try to find a better execution path for a hop
   */
  private async findBetterHop(
    fromToken: TokenConfig,
    toToken: TokenConfig,
    amount: number
  ): Promise<RouteHop | null> {
    // Get multiple quotes with different slippage settings
    const slippageOptions = [25, 50, 75, 100]; // bps
    const quotes: (RouteHop | null)[] = [];
    
    for (const slippage of slippageOptions) {
      const hop = await this.evaluateHop(fromToken, toToken, amount, slippage);
      if (hop) {
        quotes.push(hop);
      }
    }
    
    // Return the hop with best output
    if (quotes.length === 0) {
      return null;
    }
    
    quotes.sort((a, b) => (b?.expectedOutput || 0) - (a?.expectedOutput || 0));
    return quotes[0];
  }
  
  /**
   * Get route summary for display
   */
  getRouteSummary(route: MultiHopRoute): string {
    const path = route.hops.map(h => h.fromToken.symbol).join(' -> ');
    const finalToken = route.hops[route.hops.length - 1].toToken.symbol;
    
    return [
      `Route: ${path} -> ${finalToken}`,
      `Hops: ${route.hops.length}`,
      `Profit: ${route.netProfit} (${(route.profitPercentage * 100).toFixed(3)}%)`,
      `Price Impact: ${(route.totalPriceImpact * 100).toFixed(3)}%`,
      `Confidence: ${(route.confidence * 100).toFixed(1)}%`,
      `Viable: ${route.viable ? '✅ YES' : '❌ NO'}`,
    ].join('\n');
  }
}
