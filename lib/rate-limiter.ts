interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 15 * 60 * 1000) { // 10 attempts per 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    const entry = this.attempts.get(key);

    if (!entry) {
      // First attempt
      this.attempts.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return false;
    }

    if (now > entry.resetTime) {
      // Window has expired, reset
      this.attempts.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return false;
    }

    if (entry.count >= this.maxAttempts) {
      return true; // Rate limited
    }

    // Increment count
    entry.count++;
    this.attempts.set(key, entry);
    return false;
  }

  getRemainingAttempts(key: string): number {
    const entry = this.attempts.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - entry.count);
  }

  getTimeToReset(key: string): number {
    const entry = this.attempts.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return entry.resetTime - Date.now();
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.attempts.entries()) {
      if (now > entry.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

// Global rate limiter instance for emergency access
export const emergencyAccessRateLimiter = new InMemoryRateLimiter(20, 60 * 60 * 1000); // 20 attempts per hour

// Clean up expired entries every 10 minutes
setInterval(() => {
  emergencyAccessRateLimiter.cleanup();
}, 10 * 60 * 1000);

/**
 * Check if emergency access is rate limited for a given IP/token combination
 */
export function checkEmergencyAccessRateLimit(ipAddress: string, tokenId?: string): {
  isLimited: boolean;
  remainingAttempts: number;
  resetTimeMs: number;
} {
  const key = tokenId ? `${ipAddress}:${tokenId}` : ipAddress;
  const isLimited = emergencyAccessRateLimiter.isRateLimited(key);
  
  return {
    isLimited,
    remainingAttempts: emergencyAccessRateLimiter.getRemainingAttempts(key),
    resetTimeMs: emergencyAccessRateLimiter.getTimeToReset(key)
  };
}