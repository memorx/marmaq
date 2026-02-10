import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    cliente: {
      findUnique: vi.fn(),
    },
    orden: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/clientes/[id]/ordenes/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  cliente: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  orden: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

function createMockOrden(overrides: Record<string, unknown> = {}) {
  return {
    id: "orden-1",
    folio: "OS-2025-0001",
    estado: "EN_REPARACION",
    tipoServicio: "POR_COBRAR",
    prioridad: "NORMAL",
    marcaEquipo: "TORREY",
    modeloEquipo: "L-EQ 10",
    serieEquipo: "SN-123",
    fallaReportada: "No enciende",
    fechaRecepcion: new Date("2025-02-10"),
    fechaReparacion: null,
    fechaEntrega: null,
    fechaPromesa: null,
    cotizacion: null,
    cotizacionAprobada: false,
    tecnicoId: "tec-1",
    clienteId: "cli-1",
    tecnico: { id: "tec-1", name: "Técnico 1" },
    _count: { evidencias: 2 },
    ...overrides,
  };
}

function createRequest(clienteId: string, params?: Record<string, string>): NextRequest {
  const searchParams = new URLSearchParams(params);
  const url = `http://localhost:3000/api/clientes/${clienteId}/ordenes?${searchParams}`;
  return new NextRequest(url);
}

function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

describe("GET /api/clientes/[id]/ordenes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Autenticación", () => {
    it("retorna 401 si no hay sesión", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET(
        createRequest("cli-1"),
        { params: createParams("cli-1") }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("No autorizado");
    });

    it("retorna 200 para cualquier usuario autenticado", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "TECNICO" },
      });
      mockPrisma.cliente.findUnique.mockResolvedValue({
        id: "cli-1",
        nombre: "Test Client",
        empresa: null,
      });
      mockPrisma.orden.findMany.mockResolvedValue([]);
      mockPrisma.orden.count.mockResolvedValue(0);

      const response = await GET(
        createRequest("cli-1"),
        { params: createParams("cli-1") }
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Cliente no encontrado", () => {
    it("retorna 404 si el cliente no existe", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.cliente.findUnique.mockResolvedValue(null);

      const response = await GET(
        createRequest("nonexistent"),
        { params: createParams("nonexistent") }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Cliente no encontrado");
    });
  });

  describe("Paginación", () => {
    it("retorna órdenes paginadas del cliente", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.cliente.findUnique.mockResolvedValue({
        id: "cli-1",
        nombre: "Juan Pérez",
        empresa: "Carnicería El Toro",
      });

      const mockOrdenes = [
        createMockOrden({ id: "o1", folio: "OS-2025-0001" }),
        createMockOrden({ id: "o2", folio: "OS-2025-0002" }),
      ];
      mockPrisma.orden.findMany.mockResolvedValue(mockOrdenes);
      mockPrisma.orden.count.mockResolvedValue(2);

      const response = await GET(
        createRequest("cli-1"),
        { params: createParams("cli-1") }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.ordenes).toHaveLength(2);
      expect(data.pagination).toEqual({
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
      expect(data.cliente).toEqual({
        nombre: "Juan Pérez",
        empresa: "Carnicería El Toro",
      });
    });

    it("respeta parámetros de paginación", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.cliente.findUnique.mockResolvedValue({
        id: "cli-1",
        nombre: "Test",
        empresa: null,
      });
      mockPrisma.orden.findMany.mockResolvedValue([]);
      mockPrisma.orden.count.mockResolvedValue(50);

      await GET(
        createRequest("cli-1", { page: "2", pageSize: "10" }),
        { params: createParams("cli-1") }
      );

      // Verify prisma was called with correct skip/take
      expect(mockPrisma.orden.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it("limita pageSize a 100", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.cliente.findUnique.mockResolvedValue({
        id: "cli-1",
        nombre: "Test",
        empresa: null,
      });
      mockPrisma.orden.findMany.mockResolvedValue([]);
      mockPrisma.orden.count.mockResolvedValue(0);

      await GET(
        createRequest("cli-1", { pageSize: "500" }),
        { params: createParams("cli-1") }
      );

      expect(mockPrisma.orden.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });
  });

  describe("Filtro por estado", () => {
    it("filtra por estado cuando se proporciona", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.cliente.findUnique.mockResolvedValue({
        id: "cli-1",
        nombre: "Test",
        empresa: null,
      });
      mockPrisma.orden.findMany.mockResolvedValue([]);
      mockPrisma.orden.count.mockResolvedValue(0);

      await GET(
        createRequest("cli-1", { estado: "ENTREGADO" }),
        { params: createParams("cli-1") }
      );

      expect(mockPrisma.orden.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clienteId: "cli-1", estado: "ENTREGADO" },
        })
      );
    });
  });

  describe("Semáforo", () => {
    it("incluye semáforo calculado en cada orden", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.cliente.findUnique.mockResolvedValue({
        id: "cli-1",
        nombre: "Test",
        empresa: null,
      });
      mockPrisma.orden.findMany.mockResolvedValue([
        createMockOrden({ estado: "RECIBIDO", fechaRecepcion: new Date() }),
      ]);
      mockPrisma.orden.count.mockResolvedValue(1);

      const response = await GET(
        createRequest("cli-1"),
        { params: createParams("cli-1") }
      );

      const data = await response.json();
      expect(data.ordenes[0]).toHaveProperty("semaforo");
    });
  });

  describe("Resultado vacío", () => {
    it("retorna arrays vacíos cuando no hay órdenes", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.cliente.findUnique.mockResolvedValue({
        id: "cli-1",
        nombre: "Test",
        empresa: null,
      });
      mockPrisma.orden.findMany.mockResolvedValue([]);
      mockPrisma.orden.count.mockResolvedValue(0);

      const response = await GET(
        createRequest("cli-1"),
        { params: createParams("cli-1") }
      );

      const data = await response.json();
      expect(data.ordenes).toEqual([]);
      expect(data.pagination.total).toBe(0);
      expect(data.pagination.totalPages).toBe(0);
    });
  });
});
