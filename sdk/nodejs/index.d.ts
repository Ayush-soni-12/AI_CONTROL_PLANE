/**
 * TypeScript type definitions for AI Control Plane SDK
 */

/**
 * Configuration options for ControlPlaneSDK
 */
export interface ControlPlaneConfig {
  /**
   * URL of the control plane service
   * @default 'http://localhost:8000'
   */
  controlPlaneUrl?: string;

  /**
   * Name of your service
   * @default 'unknown-service'
   */
  serviceName?: string;

  /**
   * Unique tenant identifier for multi-tenant isolation
   * @default 'null'
   */
  tenantId?: string;

  /**
   * Cache TTL for configuration in milliseconds
   * @default 30000
   */
  configCacheTTL?: number;
}

/**
 * Configuration response from control plane
 */
export interface ControlPlaneConfigResponse {
  /**
   * Name of the service
   */
  service_name: string;

  /**
   * API endpoint path
   */
  endpoint: string;

  /**
   * Tenant ID if provided
   */
  tenant_id?: string | null;

  /**
   * Whether caching should be enabled
   */
  cache_enabled: boolean;

  /**
   * Whether circuit breaker is active
   */
  circuit_breaker: boolean;

  /**
   * Reason for the decision
   */
  reason: string;
}

/**
 * Control plane metadata attached to Express request
 */
export interface ControlPlaneMetadata {
  /**
   * Full configuration from control plane
   */
  config: ControlPlaneConfigResponse;

  /**
   * Whether caching should be enabled
   */
  shouldCache: boolean;

  /**
   * Whether to skip the operation (circuit breaker active)
   */
  shouldSkip: boolean;
}

/**
 * Express Request with control plane metadata
 */
declare global {
  namespace Express {
    interface Request {
      controlPlane?: ControlPlaneMetadata;
    }
  }
}

/**
 * Main SDK class for AI Control Plane
 */
export default class ControlPlaneSDK {
  /**
   * Control plane service URL
   */
  controlPlaneUrl: string;

  /**
   * Service name
   */
  serviceName: string;

  /**
   * Tenant identifier
   */
  tenantId: string;

  /**
   * Configuration cache
   */
  configCache: Record<string, { config: ControlPlaneConfigResponse; timestamp: number }>;

  /**
   * Cache TTL in milliseconds
   */
  configCacheTTL: number;

  /**
   * Create a new Control Plane SDK instance
   * @param config - Configuration options
   */
  constructor(config?: ControlPlaneConfig);

  /**
   * Send performance signal to control plane
   * @param endpoint - API endpoint path
   * @param latencyMs - Request latency in milliseconds
   * @param status - Request status ('success' or 'error')
   */
  track(endpoint: string, latencyMs: number, status?: 'success' | 'error'): Promise<void>;

  /**
   * Get runtime configuration from control plane
   * @param endpoint - API endpoint path
   * @returns Configuration with cache and circuit breaker settings
   */
  getConfig(endpoint: string): Promise<ControlPlaneConfigResponse>;

  /**
   * Express middleware for automatic tracking and configuration
   * @param endpoint - API endpoint path
   * @returns Express middleware function
   */
  middleware(endpoint: string): (req: any, res: any, next: any) => Promise<void>;
}

/**
 * Generate a unique tenant ID
 * @param prefix - Optional prefix for the tenant ID (e.g., 'user', 'org', 'customer')
 * @returns Unique tenant identifier in format: prefix-uuid
 * @example
 * ```typescript
 * const userId = generateTenantId('user');     // user-abc123...
 * const orgId = generateTenantId('org');       // org-def456...
 * const tenantId = generateTenantId();         // tenant-ghi789...
 * ```
 */
export function generateTenantId(prefix?: string): string;
