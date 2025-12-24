import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock de los módulos con clases correctamente definidas
const mockPool = vi.fn();
const mockPrismaPg = vi.fn();
const mockPrismaClient = vi.fn();

vi.mock("pg", () => ({
  Pool: class MockPool {
    connectionString: string;
    constructor(config: { connectionString: string }) {
      mockPool(config);
      this.connectionString = config.connectionString;
    }
    connect = vi.fn();
    end = vi.fn();
  },
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class MockPrismaPg {
    pool: unknown;
    constructor(pool: unknown) {
      mockPrismaPg(pool);
      this.pool = pool;
    }
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class MockPrismaClient {
    adapter: unknown;
    constructor(options: { adapter: unknown }) {
      mockPrismaClient(options);
      this.adapter = options?.adapter;
    }
    $connect = vi.fn();
    $disconnect = vi.fn();
    user = { findUnique: vi.fn(), findMany: vi.fn() };
    orden = { findUnique: vi.fn(), findMany: vi.fn() };
    cliente = { findUnique: vi.fn(), findMany: vi.fn() };
  },
}));

describe("Prisma Client Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Limpiar global singleton
    const globalForPrisma = globalThis as { prisma?: unknown; pool?: unknown };
    delete globalForPrisma.prisma;
    delete globalForPrisma.pool;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("inicialización con DATABASE_URL", () => {
    it("crea Pool con la URL de conexión correcta", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      process.env.NODE_ENV = "test";

      await import("@/lib/db/prisma");

      expect(mockPool).toHaveBeenCalledWith({
        connectionString: "postgresql://user:pass@host:5432/db",
      });
    });

    it("crea PrismaPg adapter con el pool", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      process.env.NODE_ENV = "test";

      await import("@/lib/db/prisma");

      expect(mockPrismaPg).toHaveBeenCalled();
      // Verificar que se llamó con un objeto Pool
      const poolArg = mockPrismaPg.mock.calls[0][0];
      expect(poolArg).toHaveProperty("connectionString");
    });

    it("crea PrismaClient con el adapter", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      process.env.NODE_ENV = "test";

      await import("@/lib/db/prisma");

      expect(mockPrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          adapter: expect.anything(),
        })
      );
    });
  });

  describe("manejo de errores", () => {
    it("lanza error si DATABASE_URL no está definida", async () => {
      delete process.env.DATABASE_URL;
      process.env.NODE_ENV = "test";

      await expect(async () => {
        await import("@/lib/db/prisma");
      }).rejects.toThrow("DATABASE_URL environment variable is not set");
    });

    it("lanza error si DATABASE_URL está vacía", async () => {
      process.env.DATABASE_URL = "";
      process.env.NODE_ENV = "test";

      await expect(async () => {
        await import("@/lib/db/prisma");
      }).rejects.toThrow("DATABASE_URL environment variable is not set");
    });
  });

  describe("patrón singleton", () => {
    it("exporta prisma como default y named export", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      process.env.NODE_ENV = "test";

      const prismaModule = await import("@/lib/db/prisma");

      expect(prismaModule.prisma).toBeDefined();
      expect(prismaModule.default).toBeDefined();
      expect(prismaModule.prisma).toBe(prismaModule.default);
    });

    it("guarda el cliente en global en desarrollo", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      process.env.NODE_ENV = "development";

      const globalForPrisma = globalThis as { prisma?: unknown };

      const { prisma } = await import("@/lib/db/prisma");

      expect(globalForPrisma.prisma).toBe(prisma);
    });

    it("no guarda el cliente en global en producción", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      process.env.NODE_ENV = "production";

      const globalForPrisma = globalThis as { prisma?: unknown };
      delete globalForPrisma.prisma;

      await import("@/lib/db/prisma");

      // En producción, no se asigna a global
      expect(globalForPrisma.prisma).toBeUndefined();
    });
  });

  describe("estructura del cliente", () => {
    it("prisma tiene los modelos esperados", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      process.env.NODE_ENV = "test";

      const { prisma } = await import("@/lib/db/prisma");

      expect(prisma).toHaveProperty("user");
      expect(prisma).toHaveProperty("orden");
      expect(prisma).toHaveProperty("cliente");
    });

    it("prisma.user tiene métodos de query", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      process.env.NODE_ENV = "test";

      const { prisma } = await import("@/lib/db/prisma");

      expect(prisma.user).toHaveProperty("findUnique");
      expect(prisma.user).toHaveProperty("findMany");
    });
  });
});
