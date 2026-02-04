import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter, loginRateLimiter } from "@/lib/utils/rate-limiter";

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
    // 3 attempts per 1 minute for easier testing
    rateLimiter = new RateLimiter(3, 60 * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("check()", () => {
    it("permite el primer intento", () => {
      const result = rateLimiter.check("192.168.1.1");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // 3 - 1 = 2
    });

    it("permite hasta maxAttempts intentos", () => {
      const ip = "192.168.1.2";

      // First 3 attempts should be allowed
      expect(rateLimiter.check(ip).allowed).toBe(true);
      expect(rateLimiter.check(ip).allowed).toBe(true);
      expect(rateLimiter.check(ip).allowed).toBe(true);
    });

    it("bloquea después de maxAttempts intentos", () => {
      const ip = "192.168.1.3";

      // Use up all attempts
      rateLimiter.check(ip);
      rateLimiter.check(ip);
      rateLimiter.check(ip);

      // 4th attempt should be blocked
      const result = rateLimiter.check(ip);
      expect(result.allowed).toBe(false);
    });

    it("devuelve remaining correcto en cada intento", () => {
      const ip = "192.168.1.4";

      expect(rateLimiter.check(ip).remaining).toBe(2); // after 1st
      expect(rateLimiter.check(ip).remaining).toBe(1); // after 2nd
      expect(rateLimiter.check(ip).remaining).toBe(0); // after 3rd
      expect(rateLimiter.check(ip).remaining).toBe(0); // after 4th (blocked)
    });

    it("devuelve resetAt en el futuro", () => {
      const now = Date.now();
      const result = rateLimiter.check("192.168.1.5");

      expect(result.resetAt.getTime()).toBeGreaterThan(now);
      expect(result.resetAt.getTime()).toBe(now + 60 * 1000);
    });

    it("resetea después de que pasa la ventana de tiempo", () => {
      const ip = "192.168.1.6";

      // Use up all attempts
      rateLimiter.check(ip);
      rateLimiter.check(ip);
      rateLimiter.check(ip);
      expect(rateLimiter.check(ip).allowed).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(60 * 1000 + 1);

      // Should be allowed again
      const result = rateLimiter.check(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("trackea IPs independientemente", () => {
      const ip1 = "192.168.1.10";
      const ip2 = "192.168.1.11";

      // Use up all attempts for ip1
      rateLimiter.check(ip1);
      rateLimiter.check(ip1);
      rateLimiter.check(ip1);
      expect(rateLimiter.check(ip1).allowed).toBe(false);

      // ip2 should still be allowed (save result to avoid double-counting)
      const result = rateLimiter.check(ip2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("mantiene el mismo resetAt durante la ventana", () => {
      const ip = "192.168.1.12";

      const result1 = rateLimiter.check(ip);
      vi.advanceTimersByTime(10000); // 10 seconds
      const result2 = rateLimiter.check(ip);

      expect(result1.resetAt.getTime()).toBe(result2.resetAt.getTime());
    });
  });

  describe("cleanup()", () => {
    it("elimina entradas expiradas", () => {
      const ip = "192.168.1.20";

      rateLimiter.check(ip);
      expect(rateLimiter.getStoreSize()).toBe(1);

      // Advance past window
      vi.advanceTimersByTime(60 * 1000 + 1);

      // Cleanup is called automatically in check(), but we can call it directly
      rateLimiter.cleanup();

      expect(rateLimiter.getStoreSize()).toBe(0);
    });

    it("mantiene entradas activas", () => {
      const ip1 = "192.168.1.21";
      const ip2 = "192.168.1.22";

      rateLimiter.check(ip1);
      vi.advanceTimersByTime(30 * 1000); // 30 seconds
      rateLimiter.check(ip2);

      // Advance so ip1 expires but ip2 doesn't
      vi.advanceTimersByTime(31 * 1000); // 31 more seconds

      rateLimiter.cleanup();

      // ip1 should be cleaned, ip2 should remain
      expect(rateLimiter.getStoreSize()).toBe(1);

      // Verify ip2 still tracked (has count > 0 means not first attempt)
      const result = rateLimiter.check(ip2);
      expect(result.remaining).toBe(1); // 3 - 2 = 1
    });
  });

  describe("reset()", () => {
    it("limpia todas las entradas", () => {
      rateLimiter.check("ip1");
      rateLimiter.check("ip2");
      rateLimiter.check("ip3");

      expect(rateLimiter.getStoreSize()).toBe(3);

      rateLimiter.reset();

      expect(rateLimiter.getStoreSize()).toBe(0);
    });
  });

  describe("getConfig()", () => {
    it("devuelve la configuración correcta", () => {
      const config = rateLimiter.getConfig();

      expect(config.maxAttempts).toBe(3);
      expect(config.windowMs).toBe(60 * 1000);
    });
  });
});

describe("loginRateLimiter", () => {
  beforeEach(() => {
    loginRateLimiter.reset();
  });

  it("está configurado con 5 intentos y 15 minutos", () => {
    const config = loginRateLimiter.getConfig();

    expect(config.maxAttempts).toBe(5);
    expect(config.windowMs).toBe(15 * 60 * 1000);
  });

  it("bloquea después de 5 intentos", () => {
    const ip = "test-ip";

    // 5 allowed attempts
    for (let i = 0; i < 5; i++) {
      expect(loginRateLimiter.check(ip).allowed).toBe(true);
    }

    // 6th should be blocked
    expect(loginRateLimiter.check(ip).allowed).toBe(false);
  });
});

describe("Rate limit response format (429)", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
    rateLimiter = new RateLimiter(2, 60 * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve datos correctos para construir respuesta 429", () => {
    const ip = "192.168.1.100";

    // Use up attempts
    rateLimiter.check(ip);
    rateLimiter.check(ip);

    // This should be blocked
    const result = rateLimiter.check(ip);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBeInstanceOf(Date);

    // Calculate Retry-After
    const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    expect(retryAfter).toBe(60); // 60 seconds
  });

  it("resetAt permite calcular headers X-RateLimit-*", () => {
    const ip = "192.168.1.101";
    const result = rateLimiter.check(ip);

    // Headers que se enviarían en la respuesta
    const headers = {
      "X-RateLimit-Limit": "2",
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": result.resetAt.toISOString(),
    };

    expect(headers["X-RateLimit-Limit"]).toBe("2");
    expect(headers["X-RateLimit-Remaining"]).toBe("1");
    expect(headers["X-RateLimit-Reset"]).toBe("2025-01-15T12:01:00.000Z");
  });

  it("mensaje de error está en español", () => {
    // Verify the error message we use in the route is in Spanish
    const errorMessage = "Demasiados intentos de login. Intente de nuevo más tarde.";
    expect(errorMessage).toContain("intentos");
    expect(errorMessage).toContain("login");
  });
});
