/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * Handles cross-origin requests for API endpoints
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const defaultOptions: CorsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: [
    "X-Request-Id",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Check if origin is allowed
 */
function isOriginAllowed(
  origin: string,
  allowedOrigin: string | string[] | ((origin: string) => boolean),
): boolean {
  if (allowedOrigin === "*") {
    return true;
  }

  if (typeof allowedOrigin === "function") {
    return allowedOrigin(origin);
  }

  if (Array.isArray(allowedOrigin)) {
    return allowedOrigin.includes(origin);
  }

  return allowedOrigin === origin;
}

/**
 * Set CORS headers on response
 */
export function setCorsHeaders(
  req: VercelRequest,
  res: VercelResponse,
  options: CorsOptions = {},
): void {
  const opts = { ...defaultOptions, ...options };
  const origin = req.headers.origin || "";

  // Handle origin
  if (opts.origin) {
    if (typeof opts.origin === "string" && opts.origin === "*") {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (isOriginAllowed(origin, opts.origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
  }

  // Handle credentials
  if (opts.credentials) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // Handle methods
  if (opts.methods) {
    res.setHeader("Access-Control-Allow-Methods", opts.methods.join(", "));
  }

  // Handle allowed headers
  if (opts.allowedHeaders) {
    res.setHeader(
      "Access-Control-Allow-Headers",
      opts.allowedHeaders.join(", "),
    );
  }

  // Handle exposed headers
  if (opts.exposedHeaders) {
    res.setHeader(
      "Access-Control-Expose-Headers",
      opts.exposedHeaders.join(", "),
    );
  }

  // Handle max age
  if (opts.maxAge) {
    res.setHeader("Access-Control-Max-Age", opts.maxAge.toString());
  }
}

/**
 * CORS middleware wrapper
 */
export function withCors(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<any>,
  options: CorsOptions = {},
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Set CORS headers
    setCorsHeaders(req, res, options);

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    // Continue to actual handler
    return handler(req, res);
  };
}

/**
 * Production CORS configuration
 * Restricts origins to known domains
 */
export const productionCorsOptions: CorsOptions = {
  origin: (origin: string) => {
    const allowedDomains = [
      "https://reimagined-jupiter.vercel.app",
      "https://gxq-studio.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
    ];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return true;

    // Check if origin matches allowed domains
    return allowedDomains.some((domain) => origin.startsWith(domain));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};

/**
 * Development CORS configuration
 * Allows all origins for easier testing
 */
export const developmentCorsOptions: CorsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: false,
  maxAge: 3600,
};

/**
 * Get CORS options based on environment
 */
export function getCorsOptions(): CorsOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return isProduction ? productionCorsOptions : developmentCorsOptions;
}
