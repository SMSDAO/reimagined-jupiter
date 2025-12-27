/**
 * Configuration Module Exports
 *
 * Central export point for all configuration modules
 */

// API Configuration
export {
  APIConfigManager,
  EnvironmentDetector,
  EnvironmentValidator,
  getAPIConfig,
  API,
  type Environment,
  type APIEndpoint,
  type APIConfiguration,
} from "./api-config";

// Health Checker
export {
  APIHealthChecker,
  getHealthChecker,
  startAPIHealthMonitoring,
  stopAPIHealthMonitoring,
  type HealthCheckResult,
  type HealthStatus,
} from "./health-checker";

// Vercel Configuration
export {
  VercelConfigManager,
  EdgeRuntimeChecker,
  ProductionReadinessChecker,
  getVercelConfig,
  initializeVercelConfig,
  type VercelConfig,
} from "./vercel-config";
