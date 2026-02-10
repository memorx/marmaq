import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    orden: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/equipos/historial/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
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
    serieEquipo: "SN-ABC123",
    fallaReportada: "No enciende",
    fechaRecepcion: new Date("2025-02-10"),
    fechaReparacion: null,
    fechaEntrega: null,
    fechaPromesa: null,
    cotizacion: null,
    cotizacionAprobada: false,
    tecnicoId: "tec-1",
    clienteId: "cli-1",
    cliente: { id: "cli-1", nombre: "Cliente Test", empresa: null },
    tecnico: { id: "tec-1", name: "Técnico 1" },
    ...overrides,
  };
}

function createRequest(params?: Record<string, string>): NextRequest {
  const searchParams = new URLSearchParams(params);
  return new NextRequest(
    `http://localhost:3000/api/equipos/historial?${searchParams}`
  );
}

describe("GET /api/equipos/historial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Autenticación", () => {
    it("retorna 401 si no hay sesión", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET(createRequest({ serie: "ABC123" }));

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("No autorizado");
    });

    it("retorna 200 para cualquier usuario autenticado", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "TECNICO" },
      });
      mockPrisma.orden.findMany.mockResolvedValue([]);
      mockPrisma.orden.count.mockResolvedValue(0);

      const response = await GET(createRequest({ serie: "ABC123" }));

      expect(response.status).toBe(200);
    });
  });

  describe("Parámetros requeridos", () => {
    it("retorna 400 sin parámetros de búsqueda", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });

      const response = await GET(createRequest());

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Se requiere");
    });

    it("retorna 400 con solo marca (sin modelo)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });

      const response = await GET(createRequest({ marca: "TORREY" }));

      expect(response.status).toBe(400);
    });

    it("retorna 400 con solo modelo (sin marca)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });

      const response = await GET(createRequest({ modelo: "L-EQ" }));

      expect(response.status).toBe(400);
    });
  });

  describe("Búsqueda por serie", () => {
    it("busca por serie con coincidencia exacta case-insensitive", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findMany.mockResolvedValue([
        createMockOrden(),
      ]);
      mockPrisma.orden.count.mockResolvedValue(1);

      const response = await GET(createRequest({ serie: "SN-ABC123" }));

      expect(response.status).toBe(200);
      expect(mockPrisma.orden.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            serieEquipo: { equals: "SN-ABC123", mode: "insensitive" },
          },
        })
      );
    });
  });

  describe("Búsqueda por marca + modelo", () => {
    it("busca con contains case-insensitive", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findMany.mockResolvedValue([]);
      mockPrisma.orden.count.mockResolvedValue(0);

      const response = await GET(
        createRequest({ marca: "TORREY", modelo: "L-EQ" })
      );

      expect(response.status).toBe(200);
      expect(mockPrisma.orden.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            marcaEquipo: { contains: "TORREY", mode: "insensitive" },
            modeloEquipo: { contains: "L-EQ", mode: "insensitive" },
          },
        })
      );
    });
  });

  describe("Forma de respuesta", () => {
    it("incluye ordenes, totalOrdenes y equipo", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });

      const mockOrdenes = [
        createMockOrden({ id: "o1", folio: "OS-2025-0001" }),
        createMockOrden({
          id: "o2",
          folio: "OS-2025-0002",
          estado: "ENTREGADO",
          fechaEntrega: new Date("2025-02-15"),
        }),
      ];
      mockPrisma.orden.findMany.mockResolvedValue(mockOrdenes);
      mockPrisma.orden.count.mockResolvedValue(2);

      const response = await GET(createRequest({ serie: "SN-ABC123" }));
      const data = await response.json();

      expect(data).toHaveProperty("ordenes");
      expect(data).toHaveProperty("totalOrdenes", 2);
      expect(data).toHaveProperty("equipo");
      expect(data.equipo.serie).toBe("SN-ABC123");
      expect(data.ordenes).toHaveLength(2);
    });

    it("cada orden incluye labels y semáforo", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findMany.mockResolvedValue([createMockOrden()]);
      mockPrisma.orden.count.mockResolvedValue(1);

      const response = await GET(createRequest({ serie: "SN-ABC123" }));
      const data = await response.json();

      const orden = data.ordenes[0];
      expect(orden).toHaveProperty("estadoLabel");
      expect(orden).toHaveProperty("tipoServicioLabel");
      expect(orden).toHaveProperty("semaforo");
      expect(orden).toHaveProperty("folio");
      expect(orden).toHaveProperty("cliente");
      expect(orden).toHaveProperty("tecnico");
    });
  });

  describe("Resultados vacíos", () => {
    it("retorna array vacío cuando no hay coincidencias", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findMany.mockResolvedValue([]);
      mockPrisma.orden.count.mockResolvedValue(0);

      const response = await GET(createRequest({ serie: "NONEXISTENT" }));
      const data = await response.json();

      expect(data.ordenes).toEqual([]);
      expect(data.totalOrdenes).toBe(0);
      expect(data.equipo.serie).toBe("NONEXISTENT");
    });
  });

  describe("Límite de resultados", () => {
    it("limita a 20 resultados", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      });
      mockPrisma.orden.findMany.mockResolvedValue([]);
      mockPrisma.orden.count.mockResolvedValue(0);

      await GET(createRequest({ serie: "SN-ABC123" }));

      expect(mockPrisma.orden.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });
  });
});
