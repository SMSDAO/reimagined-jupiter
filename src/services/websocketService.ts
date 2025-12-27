import WebSocket from "ws";
import { EventEmitter } from "events";
import { pythPriceFeed, PythPriceData } from "./pythPriceFeed.js";

/**
 * WebSocket Service for Real-Time Data Streaming
 * Provides live price feeds, arbitrage opportunities, and system events
 */

export interface WebSocketMessage {
  type:
    | "price_update"
    | "arbitrage_opportunity"
    | "trade_executed"
    | "error"
    | "heartbeat"
    | "subscription_ack";
  data: any;
  timestamp: number;
}

export interface ArbitrageOpportunity {
  id: string;
  type: "flash_loan" | "triangular" | "hybrid";
  tokens: string[];
  estimatedProfit: number;
  confidence: number;
  timestamp: number;
}

export class WebSocketService extends EventEmitter {
  private wss: WebSocket.Server | null = null;
  private clients: Set<WebSocket> = new Set();
  private subscriptions: Map<string, Set<WebSocket>> = new Map();
  private clientSymbols: Map<WebSocket, string[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    super();
  }

  /**
   * Start WebSocket server
   */
  start(port: number = 8080): void {
    if (this.isRunning) {
      console.log("[WebSocketService] Already running");
      return;
    }

    try {
      this.wss = new WebSocket.Server({ port });

      this.wss.on("connection", (ws: WebSocket) => {
        this.handleConnection(ws);
      });

      this.wss.on("error", (error: Error) => {
        console.error("[WebSocketService] Server error:", error);
        this.emit("error", error);
      });

      // Start heartbeat
      this.startHeartbeat();

      // Start price updates
      this.startPriceUpdates();

      this.isRunning = true;
      console.log(`[WebSocketService] Started on port ${port}`);
      this.emit("started", { port });
    } catch (error) {
      console.error("[WebSocketService] Failed to start:", error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    console.log("[WebSocketService] New client connected");
    this.clients.add(ws);

    // Send welcome message
    this.sendMessage(ws, {
      type: "subscription_ack",
      data: {
        message: "Connected to GXQ Studio WebSocket Service",
        supportedSubscriptions: ["prices", "arbitrage", "trades"],
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });

    // Handle messages from client
    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (error) {
        console.error("[WebSocketService] Error parsing message:", error);
        this.sendError(ws, "Invalid message format");
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      console.log("[WebSocketService] Client disconnected");
      this.clients.delete(ws);
      this.removeClientSubscriptions(ws);
    });

    // Handle errors
    ws.on("error", (error: Error) => {
      console.error("[WebSocketService] Client error:", error);
    });
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: WebSocket, message: any): void {
    const { type, data } = message;

    switch (type) {
      case "subscribe":
        this.handleSubscribe(ws, data);
        break;

      case "unsubscribe":
        this.handleUnsubscribe(ws, data);
        break;

      case "ping":
        this.sendMessage(ws, {
          type: "heartbeat",
          data: { pong: true },
          timestamp: Date.now(),
        });
        break;

      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscribe(ws: WebSocket, data: any): void {
    const { channel, symbols } = data;

    if (!channel) {
      this.sendError(ws, "Channel is required for subscription");
      return;
    }

    console.log(`[WebSocketService] Client subscribing to ${channel}`, symbols);

    switch (channel) {
      case "prices":
        if (!symbols || !Array.isArray(symbols)) {
          this.sendError(ws, "Symbols array required for price subscription");
          return;
        }
        this.subscribeToPrices(ws, symbols);
        break;

      case "arbitrage":
        this.subscribeToArbitrage(ws);
        break;

      case "trades":
        this.subscribeToTrades(ws);
        break;

      default:
        this.sendError(ws, `Unknown channel: ${channel}`);
    }

    this.sendMessage(ws, {
      type: "subscription_ack",
      data: { channel, status: "subscribed" },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscribe(ws: WebSocket, data: any): void {
    const { channel } = data;

    if (!channel) {
      this.sendError(ws, "Channel is required for unsubscription");
      return;
    }

    const subscribers = this.subscriptions.get(channel);
    if (subscribers) {
      subscribers.delete(ws);
      console.log(`[WebSocketService] Client unsubscribed from ${channel}`);
    }

    this.sendMessage(ws, {
      type: "subscription_ack",
      data: { channel, status: "unsubscribed" },
      timestamp: Date.now(),
    });
  }

  /**
   * Subscribe client to price updates
   */
  private subscribeToPrices(ws: WebSocket, symbols: string[]): void {
    const channel = "prices";

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(ws);

    // Store symbols for this client
    this.clientSymbols.set(ws, symbols);
  }

  /**
   * Subscribe client to arbitrage opportunities
   */
  private subscribeToArbitrage(ws: WebSocket): void {
    const channel = "arbitrage";

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(ws);
  }

  /**
   * Subscribe client to trade executions
   */
  private subscribeToTrades(ws: WebSocket): void {
    const channel = "trades";

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(ws);
  }

  /**
   * Remove all subscriptions for a client
   */
  private removeClientSubscriptions(ws: WebSocket): void {
    this.subscriptions.forEach((subscribers) => {
      subscribers.delete(ws);
    });
    this.clientSymbols.delete(ws);
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: "heartbeat",
        data: { timestamp: Date.now() },
        timestamp: Date.now(),
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Start price update polling
   */
  private startPriceUpdates(): void {
    this.priceUpdateInterval = setInterval(async () => {
      const priceSubscribers = this.subscriptions.get("prices");
      if (!priceSubscribers || priceSubscribers.size === 0) {
        return;
      }

      // Collect all unique symbols from subscribers
      const allSymbols = new Set<string>();
      priceSubscribers.forEach((ws) => {
        const symbols = this.clientSymbols.get(ws);
        if (symbols && Array.isArray(symbols)) {
          symbols.forEach((s) => allSymbols.add(s));
        }
      });

      if (allSymbols.size === 0) {
        return;
      }

      // Fetch prices
      const prices = await pythPriceFeed.getPrices(Array.from(allSymbols));

      // Send updates to subscribed clients
      priceSubscribers.forEach((ws) => {
        const symbols = this.clientSymbols.get(ws) || [];
        const relevantPrices: Record<string, PythPriceData> = {};

        symbols.forEach((symbol) => {
          const price = prices.get(symbol);
          if (price) {
            relevantPrices[symbol] = price;
          }
        });

        if (Object.keys(relevantPrices).length > 0) {
          this.sendMessage(ws, {
            type: "price_update",
            data: relevantPrices,
            timestamp: Date.now(),
          });
        }
      });
    }, 2000); // Every 2 seconds
  }

  /**
   * Broadcast arbitrage opportunity to subscribers
   */
  broadcastArbitrageOpportunity(opportunity: ArbitrageOpportunity): void {
    const subscribers = this.subscriptions.get("arbitrage");
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message: WebSocketMessage = {
      type: "arbitrage_opportunity",
      data: opportunity,
      timestamp: Date.now(),
    };

    subscribers.forEach((ws) => {
      this.sendMessage(ws, message);
    });

    console.log(
      `[WebSocketService] Broadcasted arbitrage opportunity to ${subscribers.size} clients`,
    );
  }

  /**
   * Broadcast trade execution to subscribers
   */
  broadcastTradeExecution(trade: any): void {
    const subscribers = this.subscriptions.get("trades");
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message: WebSocketMessage = {
      type: "trade_executed",
      data: trade,
      timestamp: Date.now(),
    };

    subscribers.forEach((ws) => {
      this.sendMessage(ws, message);
    });

    console.log(
      `[WebSocketService] Broadcasted trade execution to ${subscribers.size} clients`,
    );
  }

  /**
   * Send message to a specific client
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: "error",
      data: { error },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: WebSocketMessage): void {
    this.clients.forEach((ws) => {
      this.sendMessage(ws, message);
    });
  }

  /**
   * Stop WebSocket server
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("[WebSocketService] Not running");
      return;
    }

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }

    // Close all client connections
    this.clients.forEach((ws) => {
      ws.close(1000, "Server shutting down");
    });

    // Close server
    if (this.wss) {
      this.wss.close(() => {
        console.log("[WebSocketService] Server stopped");
        this.emit("stopped");
      });
      this.wss = null;
    }

    this.isRunning = false;
    this.clients.clear();
    this.subscriptions.clear();
  }

  /**
   * Get service status
   */
  getStatus(): {
    running: boolean;
    clients: number;
    subscriptions: Record<string, number>;
  } {
    const subscriptionCounts: Record<string, number> = {};
    this.subscriptions.forEach((subscribers, channel) => {
      subscriptionCounts[channel] = subscribers.size;
    });

    return {
      running: this.isRunning,
      clients: this.clients.size,
      subscriptions: subscriptionCounts,
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
