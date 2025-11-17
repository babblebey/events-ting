/**
 * Rate Limiting Utility
 * 
 * Provides in-memory rate limiting for API endpoints.
 * Uses a sliding window approach to track requests per user/identifier.
 * 
 * @module rate-limit
 */

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed within the window
   */
  maxRequests: number;
  
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Optional custom identifier function (defaults to userId)
   */
  identifier?: string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * In-memory store for rate limit records
 * Format: Map<key, { count: number, resetAt: timestamp }>
 * 
 * Note: In production, consider using Redis for distributed rate limiting
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Cleanup expired rate limit records every 5 minutes
 * Prevents memory leaks from accumulating stale records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate Limiter
 * 
 * Creates a rate limiter function that tracks requests per identifier
 * and enforces the specified limits.
 * 
 * @param config - Rate limit configuration
 * @returns Rate limiter function
 * 
 * @example
 * ```typescript
 * const inviteRateLimiter = createRateLimiter({
 *   maxRequests: 20,
 *   windowMs: 60 * 60 * 1000, // 1 hour
 * });
 * 
 * // In tRPC procedure:
 * const { allowed, remaining, resetAt } = await inviteRateLimiter.check(ctx.session.user.id);
 * if (!allowed) {
 *   throw new TRPCError({
 *     code: "TOO_MANY_REQUESTS",
 *     message: `Rate limit exceeded. Try again after ${new Date(resetAt).toLocaleTimeString()}`,
 *   });
 * }
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config;

  return {
    /**
     * Check if request is allowed and update counters
     * 
     * @param identifier - Unique identifier (typically userId)
     * @returns Rate limit status
     */
    check(identifier: string): {
      allowed: boolean;
      remaining: number;
      resetAt: number;
      limit: number;
    } {
      const now = Date.now();
      const key = `${config.identifier ?? "default"}:${identifier}`;
      
      const record = rateLimitStore.get(key);

      // No record or window expired - create new
      if (!record || record.resetAt < now) {
        const resetAt = now + windowMs;
        rateLimitStore.set(key, { count: 1, resetAt });
        
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetAt,
          limit: maxRequests,
        };
      }

      // Record exists and window still active
      if (record.count >= maxRequests) {
        // Rate limit exceeded
        return {
          allowed: false,
          remaining: 0,
          resetAt: record.resetAt,
          limit: maxRequests,
        };
      }

      // Increment counter
      record.count += 1;
      rateLimitStore.set(key, record);

      return {
        allowed: true,
        remaining: maxRequests - record.count,
        resetAt: record.resetAt,
        limit: maxRequests,
      };
    },

    /**
     * Get current rate limit status without incrementing
     * 
     * @param identifier - Unique identifier (typically userId)
     * @returns Current rate limit status
     */
    status(identifier: string): {
      remaining: number;
      resetAt: number;
      limit: number;
    } {
      const key = `${config.identifier ?? "default"}:${identifier}`;
      const record = rateLimitStore.get(key);
      const now = Date.now();

      if (!record || record.resetAt < now) {
        return {
          remaining: maxRequests,
          resetAt: now + windowMs,
          limit: maxRequests,
        };
      }

      return {
        remaining: Math.max(0, maxRequests - record.count),
        resetAt: record.resetAt,
        limit: maxRequests,
      };
    },

    /**
     * Reset rate limit for specific identifier
     * Useful for testing or administrative overrides
     * 
     * @param identifier - Unique identifier to reset
     */
    reset(identifier: string): void {
      const key = `${config.identifier ?? "default"}:${identifier}`;
      rateLimitStore.delete(key);
    },

    /**
     * Clear all rate limit records
     * Useful for testing or system maintenance
     */
    clearAll(): void {
      rateLimitStore.clear();
    },
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */

/**
 * Team Invitation Rate Limiter
 * Limits: 20 invitations per hour per user
 */
export const inviteRateLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
  identifier: "team:invite",
});

/**
 * Resend Invitation Rate Limiter
 * Limits: 5 resends per hour per user
 */
export const resendInvitationRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  identifier: "team:resend",
});

/**
 * Permission Update Rate Limiter
 * Limits: 30 permission changes per hour per user
 */
export const updatePermissionsRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 60 * 1000, // 1 hour
  identifier: "team:update-permissions",
});

/**
 * Remove Member Rate Limiter
 * Limits: 20 removals per hour per user
 */
export const removeMemberRateLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
  identifier: "team:remove",
});
