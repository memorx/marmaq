/**
 * Simple in-memory rate limiter for protecting endpoints like login
 * from brute force attacks.
 *
 * For MARMAQ's scale (~5-10 users), in-memory storage is sufficient.
 * For larger deployments, consider Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp in ms
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private maxAttempts: number;
  private windowMs: number;

  /**
   * Create a new rate limiter
   * @param maxAttempts Maximum number of attempts allowed in the window
   * @param windowMs Time window in milliseconds
   */
  constructor(maxAttempts: number, windowMs: number) {
    this.store = new Map();
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request from the given key (e.g., IP address) is allowed
   * @param key Unique identifier for the client (typically IP address)
   * @returns Object with allowed status, remaining attempts, and reset time
   */
  check(key: string): RateLimitResult {
    const now = Date.now();

    // Cleanup expired entries periodically
    this.cleanup();

    const entry = this.store.get(key);

    // No previous entry - first attempt
    if (!entry) {
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetAt: new Date(resetAt),
      };
    }

    // Entry expired - reset
    if (now >= entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetAt: new Date(resetAt),
      };
    }

    // Entry still valid - increment count
    entry.count++;
    this.store.set(key, entry);

    const allowed = entry.count <= this.maxAttempts;
    const remaining = Math.max(0, this.maxAttempts - entry.count);

    return {
      allowed,
      remaining,
      resetAt: new Date(entry.resetAt),
    };
  }

  /**
   * Remove expired entries from the store to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current configuration (useful for testing)
   */
  getConfig(): { maxAttempts: number; windowMs: number } {
    return {
      maxAttempts: this.maxAttempts,
      windowMs: this.windowMs,
    };
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset(): void {
    this.store.clear();
  }

  /**
   * Get the current store size (useful for testing/debugging)
   */
  getStoreSize(): number {
    return this.store.size;
  }
}

/**
 * Pre-configured rate limiter for login endpoint
 * - 5 attempts per IP
 * - 15 minute window
 */
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);
