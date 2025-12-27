/**
 * Realtime Scanner for Webapp
 *
 * Provides real-time arbitrage scanning with proper WebSocket cleanup
 * to prevent memory leaks in long-running browser sessions.
 *
 * Features:
 * - WebSocket connection management
 * - Automatic cleanup on unmount
 * - Connection tracking with Set
 * - Interval cleanup
 * - Event listener cleanup
 */

import { Connection, PublicKey } from "@solana/web3.js";

export interface ArbitrageOpportunity {
  id: string;
  type: "arbitrage" | "flash-loan" | "triangular";
  inputMint: string;
  outputMint: string;
  inputSymbol: string;
  outputSymbol: string;
  profitPercentage: number;
  estimatedProfit: number;
  route: string[];
  priceImpact: number;
  timestamp: number;
  confidence?: number;
}

export interface ScannerConfig {
  pollingIntervalMs?: number;
  minProfitThreshold?: number;
  enableWebSocket?: boolean;
}

export type OpportunityCallback = (opportunity: ArbitrageOpportunity) => void;

/**
 * RealTimeScanner with proper cleanup
 */
export class RealTimeScanner {
  private connection: Connection | null = null;
  private config: ScannerConfig;
  private isScanning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private opportunityCallbacks: OpportunityCallback[] = [];

  // Cleanup tracking
  private webSocketConnections: Set<WebSocket> = new Set();
  private intervals: Set<NodeJS.Timeout> = new Set();
  private eventListeners: Map<EventTarget, Map<string, EventListener>> =
    new Map();
  private isCleanedUp: boolean = false;

  constructor(connection: Connection, config: ScannerConfig = {}) {
    this.connection = connection;
    this.config = {
      pollingIntervalMs: config.pollingIntervalMs || 5000,
      minProfitThreshold: config.minProfitThreshold || 0.5,
      enableWebSocket: config.enableWebSocket ?? false,
    };

    // Register cleanup on browser/tab close
    if (typeof window !== "undefined") {
      this.registerBrowserCleanupHandlers();
    }
  }

  /**
   * Register cleanup handlers for browser events
   */
  private registerBrowserCleanupHandlers(): void {
    // Cleanup on page unload
    const unloadHandler = () => {
      this.cleanup();
    };

    window.addEventListener("beforeunload", unloadHandler);
    this.trackEventListener(window, "beforeunload", unloadHandler);

    // Cleanup on visibility change (tab hidden)
    const visibilityHandler = () => {
      if (document.hidden) {
        console.log("[Scanner] Tab hidden, pausing scanning...");
        this.pauseScanning();
      } else {
        console.log("[Scanner] Tab visible, resuming scanning...");
        this.resumeScanning();
      }
    };

    document.addEventListener("visibilitychange", visibilityHandler);
    this.trackEventListener(document, "visibilitychange", visibilityHandler);
  }

  /**
   * Track event listener for cleanup
   */
  private trackEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
  ): void {
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, new Map());
    }
    this.eventListeners.get(target)!.set(type, listener);
  }

  /**
   * Start scanning for opportunities
   */
  start(): void {
    if (this.isScanning) {
      console.warn("[Scanner] Already scanning");
      return;
    }

    this.isScanning = true;
    console.log("[Scanner] Starting real-time scanning...");

    // Perform initial scan
    this.performScan();

    // Schedule periodic scans
    this.scanInterval = setInterval(() => {
      if (this.isScanning) {
        this.performScan();
      }
    }, this.config.pollingIntervalMs!);

    // Track interval for cleanup
    this.intervals.add(this.scanInterval);

    // Connect WebSocket if enabled
    if (this.config.enableWebSocket) {
      this.connectWebSocket();
    }
  }

  /**
   * Stop scanning
   */
  stop(): void {
    if (!this.isScanning) {
      return;
    }

    this.isScanning = false;
    console.log("[Scanner] Stopping scanning...");

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.intervals.delete(this.scanInterval);
      this.scanInterval = null;
    }
  }

  /**
   * Pause scanning (keep resources, just pause)
   */
  private pauseScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  /**
   * Resume scanning
   */
  private resumeScanning(): void {
    if (this.isScanning && !this.scanInterval) {
      this.scanInterval = setInterval(() => {
        if (this.isScanning) {
          this.performScan();
        }
      }, this.config.pollingIntervalMs!);

      this.intervals.add(this.scanInterval);
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private connectWebSocket(): void {
    try {
      // Example: Connect to Pyth price feed or custom WebSocket server
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://example.com/ws";
      const ws = new WebSocket(wsUrl);

      // Track connection for cleanup
      this.webSocketConnections.add(ws);

      ws.onopen = () => {
        console.log("[Scanner] WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error("[Scanner] WebSocket message parse error:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[Scanner] WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("[Scanner] WebSocket closed");
        this.webSocketConnections.delete(ws);

        // Reconnect if still scanning
        if (this.isScanning && !this.isCleanedUp) {
          setTimeout(() => {
            if (this.isScanning) {
              this.connectWebSocket();
            }
          }, 5000);
        }
      };
    } catch (error) {
      console.error("[Scanner] WebSocket connection error:", error);
    }
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(data: any): void {
    // Process real-time data from WebSocket
    // This could be price updates, new opportunities, etc.
    console.log("[Scanner] WebSocket message:", data);
  }

  /**
   * Perform a scan for arbitrage opportunities
   */
  private async performScan(): Promise<void> {
    try {
      console.log("[Scanner] Scanning for opportunities...");

      // In a real implementation, this would:
      // 1. Fetch current prices
      // 2. Check for arbitrage opportunities
      // 3. Calculate profitability
      // 4. Notify callbacks

      // For now, this is a placeholder
      // The actual scanning logic would be implemented based on requirements
    } catch (error) {
      console.error("[Scanner] Scan error:", error);
    }
  }

  /**
   * Register callback for opportunities
   */
  onOpportunity(callback: OpportunityCallback): void {
    this.opportunityCallbacks.push(callback);
  }

  /**
   * Notify all callbacks of new opportunity
   */
  private notifyOpportunity(opportunity: ArbitrageOpportunity): void {
    this.opportunityCallbacks.forEach((callback) => {
      try {
        callback(opportunity);
      } catch (error) {
        console.error("[Scanner] Callback error:", error);
      }
    });
  }

  /**
   * Cleanup all resources
   * CRITICAL: Must be called to prevent memory leaks
   */
  cleanup(): void {
    if (this.isCleanedUp) {
      return;
    }

    console.log("[Scanner] Cleaning up resources...");

    // Stop scanning
    this.stop();

    // Close all WebSocket connections
    this.webSocketConnections.forEach((ws) => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    });
    this.webSocketConnections.clear();

    // Clear all intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    // Remove all event listeners
    this.eventListeners.forEach((listeners, target) => {
      listeners.forEach((listener, type) => {
        target.removeEventListener(type, listener);
      });
    });
    this.eventListeners.clear();

    // Clear callbacks
    this.opportunityCallbacks = [];

    this.isCleanedUp = true;
    console.log("[Scanner] Cleanup complete");
  }

  /**
   * Destroy scanner instance
   * Public method to manually trigger cleanup
   */
  destroy(): void {
    this.cleanup();
    this.connection = null;
  }

  /**
   * Check if scanner is running
   */
  isRunning(): boolean {
    return this.isScanning;
  }
}

/**
 * React Hook for RealTimeScanner with automatic cleanup
 * Use this in React components to ensure proper cleanup on unmount
 */
export function useRealTimeScanner(
  connection: Connection,
  config?: ScannerConfig,
): RealTimeScanner | null {
  if (typeof window === "undefined") {
    return null; // Server-side
  }

  const [scanner] = React.useState(
    () => new RealTimeScanner(connection, config),
  );

  React.useEffect(() => {
    // Cleanup on unmount
    return () => {
      scanner.cleanup();
    };
  }, [scanner]);

  return scanner;
}

// For non-React usage, export the scanner
export { RealTimeScanner as default };

// Need to import React for the hook
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
