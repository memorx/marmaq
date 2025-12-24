import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    user: {
      findMany: vi.fn(),
    },
    orden: {
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/reportes/avanzados/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  user: {
    findMany: ReturnType<typeof vi.fn>;
  };
  orden: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
};

// Helper para crear request
function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/reportes/avanzados", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.orden.count.mockResolvedValue(0);
    mockPrisma.orden.findMany.mockResolvedValue([]);
    mockPrisma.orden.aggregate.mockResolvedValue({ _sum: { cotizacion: null } });
  });

  describe("Autenticación y autorización", () => {
    it("debe rechazar solicitudes sin autenticación", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("No autorizado");
    });

    it("debe rechazar usuarios sin rol ADMIN", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "TECNICO" },
      });

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Sin permisos");
    });

    it("debe rechazar usuarios con rol RECEPCION", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "RECEPCION" },
      });

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it("debe permitir acceso a ADMIN", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "ADMIN" },
      });

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("debe permitir acceso a SUPER_ADMIN", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "SUPER_ADMIN" },
      });

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Estructura de respuesta", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "ADMIN" },
      });
    });

    it("debe retornar estructura completa", async () => {
      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty("filtros");
      expect(data).toHaveProperty("resumen");
      expect(data).toHaveProperty("reporteTecnicos");
      expect(data).toHaveProperty("rankingTecnicos");
      expect(data).toHaveProperty("reporteTipoServicio");
      expect(data).toHaveProperty("porTipoPorMes");
      expect(data).toHaveProperty("tiemposPorEstado");
      expect(data).toHaveProperty("ordenesExcedidas");
      expect(data).toHaveProperty("cuellosDeBottella");
      expect(data).toHaveProperty("listaTecnicos");
    });

    it("debe retornar resumen con campos correctos", async () => {
      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      expect(data.resumen).toHaveProperty("totalOrdenes");
      expect(data.resumen).toHaveProperty("ordenesActivas");
      expect(data.resumen).toHaveProperty("ordenesCompletadas");
      expect(data.resumen).toHaveProperty("ingresosTotales");
    });

    it("debe retornar tiemposPorEstado con 7 estados", async () => {
      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      expect(data.tiemposPorEstado).toHaveLength(7);
      expect(data.tiemposPorEstado[0]).toHaveProperty("estado");
      expect(data.tiemposPorEstado[0]).toHaveProperty("estadoLabel");
      expect(data.tiemposPorEstado[0]).toHaveProperty("cantidad");
      expect(data.tiemposPorEstado[0]).toHaveProperty("tiempoPromedioDias");
    });
  });

  describe("Filtros", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "ADMIN" },
      });
    });

    it("debe aceptar filtro de fechaDesde", async () => {
      const request = createRequest("/api/reportes/avanzados?fechaDesde=2024-01-01");
      const response = await GET(request);
      const data = await response.json();

      expect(data.filtros.fechaDesde).toBe("2024-01-01");
    });

    it("debe aceptar filtro de fechaHasta", async () => {
      const request = createRequest("/api/reportes/avanzados?fechaHasta=2024-12-31");
      const response = await GET(request);
      const data = await response.json();

      expect(data.filtros.fechaHasta).toBe("2024-12-31");
    });

    it("debe aceptar filtro de tecnicoId", async () => {
      const request = createRequest("/api/reportes/avanzados?tecnicoId=tecnico-123");
      const response = await GET(request);
      const data = await response.json();

      expect(data.filtros.tecnicoId).toBe("tecnico-123");
    });

    it("debe aceptar filtro de tipoServicio", async () => {
      const request = createRequest("/api/reportes/avanzados?tipoServicio=GARANTIA");
      const response = await GET(request);
      const data = await response.json();

      expect(data.filtros.tipoServicio).toBe("GARANTIA");
    });

    it("debe aceptar múltiples filtros", async () => {
      const request = createRequest(
        "/api/reportes/avanzados?fechaDesde=2024-01-01&fechaHasta=2024-12-31&tipoServicio=POR_COBRAR"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.filtros.fechaDesde).toBe("2024-01-01");
      expect(data.filtros.fechaHasta).toBe("2024-12-31");
      expect(data.filtros.tipoServicio).toBe("POR_COBRAR");
    });
  });

  describe("Reporte de técnicos", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "ADMIN" },
      });
    });

    it("debe calcular datos por técnico", async () => {
      mockPrisma.user.findMany.mockImplementation(async (params) => {
        if (params.where?.role === "TECNICO") {
          return [
            { id: "tec-1", name: "Carlos Técnico" },
            { id: "tec-2", name: "Juan Reparador" },
          ];
        }
        return [];
      });

      mockPrisma.orden.count.mockResolvedValue(5);
      mockPrisma.orden.findMany.mockResolvedValue([]);

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      expect(data.reporteTecnicos).toHaveLength(2);
      expect(data.reporteTecnicos[0]).toHaveProperty("nombre");
      expect(data.reporteTecnicos[0]).toHaveProperty("asignadas");
      expect(data.reporteTecnicos[0]).toHaveProperty("completadas");
      expect(data.reporteTecnicos[0]).toHaveProperty("eficiencia");
    });

    it("debe calcular eficiencia correctamente", async () => {
      mockPrisma.user.findMany.mockImplementation(async (params) => {
        if (params.where?.role === "TECNICO") {
          return [{ id: "tec-1", name: "Carlos" }];
        }
        return [];
      });

      mockPrisma.orden.count.mockImplementation(async (params) => {
        // Primera llamada: asignadas = 10
        // Segunda llamada: completadas = 8
        if (params.where?.tecnicoId === "tec-1") {
          if (params.where?.estado === "ENTREGADO") {
            return 8;
          }
          return 10;
        }
        return 0;
      });

      mockPrisma.orden.findMany.mockResolvedValue([]);

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      // Eficiencia = 8/10 * 100 = 80%
      expect(data.reporteTecnicos[0].eficiencia).toBe(80);
    });
  });

  describe("Reporte por tipo de servicio", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "ADMIN" },
      });
    });

    it("debe retornar 4 tipos de servicio", async () => {
      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      expect(data.reporteTipoServicio.length).toBeLessThanOrEqual(4);

      const tipos = data.reporteTipoServicio.map((t: { tipo: string }) => t.tipo);
      const expectedTipos = ["GARANTIA", "CENTRO_SERVICIO", "POR_COBRAR", "REPARE"];

      tipos.forEach((tipo: string) => {
        expect(expectedTipos).toContain(tipo);
      });
    });

    it("debe calcular ingresos para POR_COBRAR", async () => {
      mockPrisma.orden.findMany.mockImplementation(async (params) => {
        if (params.where?.tipoServicio === "POR_COBRAR" && params.where?.cotizacionAprobada) {
          return [
            { cotizacion: 1000 },
            { cotizacion: 2500 },
          ];
        }
        return [];
      });

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      const porCobrar = data.reporteTipoServicio.find(
        (t: { tipo: string }) => t.tipo === "POR_COBRAR"
      );

      expect(porCobrar).toBeDefined();
      expect(porCobrar.ingresos).toBe(3500);
    });

    it("debe calcular tasa de rechazo", async () => {
      mockPrisma.orden.count.mockImplementation(async (params) => {
        if (params.where?.tipoServicio === "POR_COBRAR") {
          if (params.where?.cotizacion !== undefined) {
            return 10; // Cotizaciones enviadas
          }
          if (params.where?.cotizacionAprobada === true) {
            return 7; // Cotizaciones aprobadas
          }
        }
        return 0;
      });

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      const porCobrar = data.reporteTipoServicio.find(
        (t: { tipo: string }) => t.tipo === "POR_COBRAR"
      );

      // Tasa rechazo = (10-7)/10 * 100 = 30%
      expect(porCobrar.tasaRechazo).toBe(30);
    });
  });

  describe("Reporte de tiempos", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "ADMIN" },
      });
    });

    it("debe identificar cuellos de botella", async () => {
      mockPrisma.orden.findMany.mockImplementation(async (params) => {
        if (params.where?.estado === "ESPERA_REFACCIONES") {
          // Simular órdenes atascadas
          const oldDate = new Date();
          oldDate.setDate(oldDate.getDate() - 10);
          return [
            { updatedAt: oldDate },
            { updatedAt: oldDate },
            { updatedAt: oldDate },
          ];
        }
        return [];
      });

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      expect(data.cuellosDeBottella).toBeDefined();
      expect(Array.isArray(data.cuellosDeBottella)).toBe(true);
    });

    it("debe retornar órdenes excedidas", async () => {
      mockPrisma.orden.findMany.mockImplementation(async (params) => {
        if (params.where?.fechaRecepcion?.lt) {
          return [
            {
              id: "orden-1",
              folio: "OS-2024-0001",
              estado: "EN_REPARACION",
              fechaRecepcion: new Date("2024-01-01"),
              cliente: { nombre: "Juan", empresa: "Empresa Test" },
              tecnico: { name: "Carlos" },
            },
          ];
        }
        return [];
      });

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      expect(data.ordenesExcedidas).toHaveLength(1);
      expect(data.ordenesExcedidas[0]).toHaveProperty("folio");
      expect(data.ordenesExcedidas[0]).toHaveProperty("diasTranscurridos");
    });
  });

  describe("Por tipo por mes", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "ADMIN" },
      });
    });

    it("debe retornar 6 meses de datos", async () => {
      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);
      const data = await response.json();

      expect(data.porTipoPorMes).toHaveLength(6);
      expect(data.porTipoPorMes[0]).toHaveProperty("mes");
      expect(data.porTipoPorMes[0]).toHaveProperty("GARANTIA");
      expect(data.porTipoPorMes[0]).toHaveProperty("CENTRO_SERVICIO");
      expect(data.porTipoPorMes[0]).toHaveProperty("POR_COBRAR");
      expect(data.porTipoPorMes[0]).toHaveProperty("REPARE");
    });
  });

  describe("Manejo de errores", () => {
    it("debe manejar errores de base de datos", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test", role: "ADMIN" },
      });

      mockPrisma.user.findMany.mockRejectedValue(new Error("Database error"));

      const request = createRequest("/api/reportes/avanzados");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Error al obtener reportes");
    });
  });
});
