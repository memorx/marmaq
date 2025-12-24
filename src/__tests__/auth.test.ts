import { describe, it, expect } from "vitest";
import { authConfig } from "@/lib/auth/auth.config";

// Mock de NextURL
const createMockNextUrl = (pathname: string) => ({
  pathname,
  toString: () => `http://localhost:3000${pathname}`,
});

// Mock de request
const createMockRequest = (pathname: string) => ({
  nextUrl: createMockNextUrl(pathname),
});

describe("authConfig", () => {
  describe("estructura de configuración", () => {
    it("tiene providers vacíos (se añaden en auth.ts)", () => {
      expect(authConfig.providers).toEqual([]);
    });

    it("usa estrategia JWT para sesiones", () => {
      expect(authConfig.session?.strategy).toBe("jwt");
    });

    it("tiene página de login configurada", () => {
      expect(authConfig.pages?.signIn).toBe("/login");
    });

    it("tiene callbacks definidos", () => {
      expect(authConfig.callbacks).toBeDefined();
      expect(authConfig.callbacks?.authorized).toBeDefined();
      expect(authConfig.callbacks?.jwt).toBeDefined();
      expect(authConfig.callbacks?.session).toBeDefined();
    });
  });

  describe("callback authorized", () => {
    const authorized = authConfig.callbacks?.authorized;

    it("permite acceso a rutas de API auth", () => {
      const result = authorized?.({
        auth: null,
        request: createMockRequest("/api/auth/signin"),
      } as Parameters<NonNullable<typeof authorized>>[0]);

      expect(result).toBe(true);
    });

    it("permite acceso a rutas de API auth callback", () => {
      const result = authorized?.({
        auth: null,
        request: createMockRequest("/api/auth/callback/credentials"),
      } as Parameters<NonNullable<typeof authorized>>[0]);

      expect(result).toBe(true);
    });

    it("deniega acceso a dashboard sin autenticación", () => {
      const result = authorized?.({
        auth: null,
        request: createMockRequest("/dashboard"),
      } as Parameters<NonNullable<typeof authorized>>[0]);

      expect(result).toBe(false);
    });

    it("permite acceso a login sin autenticación", () => {
      const result = authorized?.({
        auth: null,
        request: createMockRequest("/login"),
      } as Parameters<NonNullable<typeof authorized>>[0]);

      expect(result).toBe(true);
    });

    it("permite acceso a dashboard con autenticación", () => {
      const result = authorized?.({
        auth: { user: { id: "123", email: "test@test.com" } },
        request: createMockRequest("/dashboard"),
      } as Parameters<NonNullable<typeof authorized>>[0]);

      expect(result).toBe(true);
    });

    it("redirige a dashboard si usuario autenticado va a login", () => {
      const result = authorized?.({
        auth: { user: { id: "123", email: "test@test.com" } },
        request: createMockRequest("/login"),
      } as Parameters<NonNullable<typeof authorized>>[0]);

      expect(result).toBeInstanceOf(Response);
      if (result instanceof Response) {
        expect(result.headers.get("location")).toContain("/dashboard");
      }
    });
  });

  describe("callback jwt", () => {
    const jwt = authConfig.callbacks?.jwt;

    it("añade id y role al token cuando hay usuario", async () => {
      const token = { sub: "123" };
      const user = { id: "user-123", email: "test@test.com", role: "TECNICO" };

      const result = await jwt?.({
        token,
        user,
        account: null,
        trigger: "signIn",
      } as Parameters<NonNullable<typeof jwt>>[0]);

      expect(result?.id).toBe("user-123");
      expect(result?.role).toBe("TECNICO");
    });

    it("mantiene token sin cambios cuando no hay usuario", async () => {
      const token = { sub: "123", id: "existing-id", role: "ADMIN" };

      const result = await jwt?.({
        token,
        user: undefined,
        account: null,
        trigger: "update",
      } as Parameters<NonNullable<typeof jwt>>[0]);

      expect(result?.id).toBe("existing-id");
      expect(result?.role).toBe("ADMIN");
    });

    it("maneja diferentes roles correctamente", async () => {
      const roles = ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES", "TECNICO"];

      for (const role of roles) {
        const token = {};
        const user = { id: "user-123", role };

        const result = await jwt?.({
          token,
          user,
          account: null,
          trigger: "signIn",
        } as Parameters<NonNullable<typeof jwt>>[0]);

        expect(result?.role).toBe(role);
      }
    });
  });

  describe("callback session", () => {
    const session = authConfig.callbacks?.session;

    it("añade id y role a session.user desde token", async () => {
      const sessionData = {
        user: { email: "test@test.com", name: "Test User" },
        expires: new Date().toISOString(),
      };
      const token = { id: "user-123", role: "COORD_SERVICIO" };

      const result = await session?.({
        session: sessionData,
        token,
        user: undefined as never,
        trigger: "update",
        newSession: undefined,
      });

      expect(result?.user?.id).toBe("user-123");
      expect(result?.user?.role).toBe("COORD_SERVICIO");
    });

    it("mantiene datos existentes del usuario", async () => {
      const sessionData = {
        user: { email: "admin@marmaq.com", name: "Admin User" },
        expires: new Date().toISOString(),
      };
      const token = { id: "admin-id", role: "SUPER_ADMIN" };

      const result = await session?.({
        session: sessionData,
        token,
        user: undefined as never,
        trigger: "update",
        newSession: undefined,
      });

      expect(result?.user?.email).toBe("admin@marmaq.com");
      expect(result?.user?.name).toBe("Admin User");
      expect(result?.user?.id).toBe("admin-id");
      expect(result?.user?.role).toBe("SUPER_ADMIN");
    });
  });
});

describe("authConfig - edge cases", () => {
  describe("callback authorized - rutas protegidas", () => {
    const authorized = authConfig.callbacks?.authorized;

    it("protege rutas de órdenes", () => {
      const result = authorized?.({
        auth: null,
        request: createMockRequest("/ordenes"),
      } as Parameters<NonNullable<typeof authorized>>[0]);

      expect(result).toBe(false);
    });

    it("protege rutas de órdenes específicas", () => {
      const result = authorized?.({
        auth: null,
        request: createMockRequest("/ordenes/abc123"),
      } as Parameters<NonNullable<typeof authorized>>[0]);

      expect(result).toBe(false);
    });

    it("protege ruta de nueva orden", () => {
      const result = authorized?.({
        auth: null,
        request: createMockRequest("/ordenes/nueva"),
      } as Parameters<NonNullable<typeof authorized>>[0]);

      expect(result).toBe(false);
    });
  });
});
