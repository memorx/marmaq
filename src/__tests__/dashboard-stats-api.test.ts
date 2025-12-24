import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    orden: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/dashboard/stats/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: {
    groupBy: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe("GET /api/dashboard/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for all prisma methods
    mockPrisma.orden.groupBy.mockResolvedValue([]);
    mockPrisma.orden.findMany.mockResolvedValue([]);
    mockPrisma.orden.count.mockResolvedValue(0);
    mockPrisma.user.findUnique.mockResolvedValue(null);
  });

  describe("Autenticación", () => {
    it("debe rechazar solicitudes sin autenticación", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("No autorizado");
    });

    it("debe rechazar si no hay usuario en la sesión", async () => {
      mockAuth.mockResolvedValue({ user: null });

      const response = await GET();

      expect(response.status).toBe(401);
    });
  });

  describe("Respuesta exitosa", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "ADMIN" },
      });
    });

    it("debe retornar estructura de datos correcta", async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verificar estructura principal
      expect(data).toHaveProperty("ordenesPorMes");
      expect(data).toHaveProperty("distribucionTipoServicio");
      expect(data).toHaveProperty("distribucionEstado");
      expect(data).toHaveProperty("kpis");
      expect(data).toHaveProperty("semaforo");
      expect(data).toHaveProperty("stats");
      expect(data).toHaveProperty("ordenesRecientes");
    });

    it("debe retornar ordenesPorMes con 6 meses", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.ordenesPorMes).toHaveLength(6);
      expect(data.ordenesPorMes[0]).toHaveProperty("mes");
      expect(data.ordenesPorMes[0]).toHaveProperty("cantidad");
    });

    it("debe retornar kpis con todos los campos", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.kpis).toHaveProperty("tiempoPromedioReparacion");
      expect(data.kpis).toHaveProperty("completadasEsteMes");
      expect(data.kpis).toHaveProperty("completadasMesAnterior");
      expect(data.kpis).toHaveProperty("tendenciaCompletadas");
      expect(data.kpis).toHaveProperty("tecnicoTop");
    });

    it("debe retornar semáforo con 5 colores", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.semaforo).toHaveLength(5);

      const colores = data.semaforo.map((s: { color: string }) => s.color);
      expect(colores).toContain("rojo");
      expect(colores).toContain("naranja");
      expect(colores).toContain("amarillo");
      expect(colores).toContain("verde");
      expect(colores).toContain("azul");
    });

    it("debe retornar stats con todos los campos", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.stats).toHaveProperty("ordenesActivas");
      expect(data.stats).toHaveProperty("enDiagnostico");
      expect(data.stats).toHaveProperty("reparadosHoy");
      expect(data.stats).toHaveProperty("tendenciaReparados");
      expect(data.stats).toHaveProperty("pendientesEvidencias");
    });
  });

  describe("Cálculos de datos", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "ADMIN" },
      });
    });

    it("debe calcular distribución por tipo de servicio", async () => {
      mockPrisma.orden.groupBy.mockImplementation(async (params) => {
        if (params.by && params.by.includes("tipoServicio")) {
          return [
            { tipoServicio: "GARANTIA", _count: { id: 10 } },
            { tipoServicio: "POR_COBRAR", _count: { id: 5 } },
          ];
        }
        return [];
      });

      const response = await GET();
      const data = await response.json();

      expect(data.distribucionTipoServicio).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tipoKey: "GARANTIA", cantidad: 10 }),
          expect.objectContaining({ tipoKey: "POR_COBRAR", cantidad: 5 }),
        ])
      );
    });

    it("debe calcular distribución por estado", async () => {
      mockPrisma.orden.groupBy.mockImplementation(async (params) => {
        if (params.by && params.by.includes("estado")) {
          return [
            { estado: "EN_REPARACION", _count: { id: 8 } },
            { estado: "EN_DIAGNOSTICO", _count: { id: 3 } },
          ];
        }
        return [];
      });

      const response = await GET();
      const data = await response.json();

      expect(data.distribucionEstado).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ estadoKey: "EN_REPARACION", cantidad: 8 }),
          expect.objectContaining({ estadoKey: "EN_DIAGNOSTICO", cantidad: 3 }),
        ])
      );
    });

    it("debe calcular tiempo promedio de reparación", async () => {
      const fechaRecepcion = new Date("2024-01-01");
      const fechaEntrega = new Date("2024-01-04"); // 3 días después

      mockPrisma.orden.findMany.mockImplementation(async (params) => {
        // Query para órdenes completadas (tiempo promedio)
        if (params.where?.estado === "ENTREGADO") {
          return [{ fechaRecepcion, fechaEntrega }];
        }
        // Query para órdenes recientes (take: 5)
        if (params.take === 5) {
          return [];
        }
        return [];
      });

      const response = await GET();
      const data = await response.json();

      expect(data.kpis.tiempoPromedioReparacion).toBe(3);
    });

    it("debe identificar técnico top del mes", async () => {
      mockPrisma.orden.groupBy.mockImplementation(async (params) => {
        if (params.by && params.by.includes("tecnicoId")) {
          return [{ tecnicoId: "tecnico-1", _count: { id: 15 } }];
        }
        return [];
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        name: "Carlos Técnico",
      });

      const response = await GET();
      const data = await response.json();

      expect(data.kpis.tecnicoTop).toEqual({
        nombre: "Carlos Técnico",
        ordenes: 15,
      });
    });

    it("debe retornar null para tecnicoTop si no hay datos", async () => {
      mockPrisma.orden.groupBy.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(data.kpis.tecnicoTop).toBeNull();
    });
  });

  describe("Conteos del semáforo", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "ADMIN" },
      });
    });

    it("debe contar órdenes para cada color del semáforo", async () => {
      let countCall = 0;
      mockPrisma.orden.count.mockImplementation(async () => {
        countCall++;
        // Simular diferentes conteos según la llamada
        const counts = [3, 5, 4, 12, 2, 26, 8, 4, 3, 7]; // rojo, naranja, amarillo, verde, azul, activas, diagnostico, reparados, etc.
        return counts[countCall - 1] || 0;
      });

      const response = await GET();
      const data = await response.json();

      expect(data.semaforo[0]).toMatchObject({
        color: "rojo",
        label: "Crítico",
        description: "Equipo listo > 5 días sin recoger",
      });
      expect(typeof data.semaforo[0].count).toBe("number");
    });
  });

  describe("Órdenes recientes", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "ADMIN" },
      });
    });

    it("debe formatear órdenes recientes correctamente", async () => {
      mockPrisma.orden.findMany.mockImplementation(async (params) => {
        if (params.take === 5) {
          return [
            {
              id: "orden-1",
              folio: "OS-2024-0001",
              marcaEquipo: "TORREY",
              modeloEquipo: "L-EQ 10",
              tipoServicio: "GARANTIA",
              estado: "EN_REPARACION",
              fechaRecepcion: new Date(),
              updatedAt: new Date(),
              cliente: { nombre: "Juan Pérez", empresa: "Carnicería El Toro" },
            },
          ];
        }
        return [];
      });

      const response = await GET();
      const data = await response.json();

      expect(data.ordenesRecientes).toHaveLength(1);
      expect(data.ordenesRecientes[0]).toMatchObject({
        id: "orden-1",
        folio: "OS-2024-0001",
        cliente: "Carnicería El Toro",
        equipo: "TORREY L-EQ 10",
        tipoServicio: "GARANTIA",
        estado: "EN_REPARACION",
      });
    });

    it("debe asignar semáforo correcto a órdenes", async () => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      mockPrisma.orden.findMany.mockImplementation(async (params) => {
        if (params.take === 5) {
          return [
            {
              id: "orden-1",
              folio: "OS-2024-0001",
              marcaEquipo: "TORREY",
              modeloEquipo: "L-EQ 10",
              tipoServicio: "GARANTIA",
              estado: "ESPERA_REFACCIONES",
              fechaRecepcion: new Date(),
              updatedAt: new Date(),
              cliente: { nombre: "Juan", empresa: null },
            },
          ];
        }
        return [];
      });

      const response = await GET();
      const data = await response.json();

      expect(data.ordenesRecientes[0].semaforo).toBe("naranja");
    });
  });

  describe("Tendencias", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "ADMIN" },
      });
    });

    it("debe calcular tendencia positiva correctamente", async () => {
      mockPrisma.orden.count.mockImplementation(async (params) => {
        // Detectar query para completadas este mes vs mes anterior
        if (params.where?.estado === "ENTREGADO" && params.where?.fechaEntrega?.gte) {
          const fechaGte = new Date(params.where.fechaEntrega.gte);
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          // Si es inicio de este mes -> completadas este mes
          if (fechaGte.getMonth() === startOfMonth.getMonth()) {
            return 15;
          }
          // Si es inicio del mes pasado -> completadas mes anterior
          return 10;
        }
        return 0;
      });

      const response = await GET();
      const data = await response.json();

      // (15 - 10) / 10 * 100 = 50%
      expect(data.kpis.tendenciaCompletadas).toBe(50);
    });

    it("debe manejar tendencia cuando mes anterior es 0", async () => {
      mockPrisma.orden.count.mockImplementation(async (params) => {
        if (params.where?.estado === "ENTREGADO" && params.where?.fechaEntrega?.gte) {
          const fechaGte = new Date(params.where.fechaEntrega.gte);
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          if (fechaGte.getMonth() === startOfMonth.getMonth()) {
            return 5; // este mes
          }
          return 0; // mes anterior
        }
        return 0;
      });

      const response = await GET();
      const data = await response.json();

      expect(data.kpis.tendenciaCompletadas).toBe(100);
    });
  });

  describe("Roles de usuario", () => {
    const roles = ["SUPER_ADMIN", "ADMIN", "TECNICO", "RECEPCION"];

    roles.forEach((role) => {
      it(`debe permitir acceso a usuario con rol ${role}`, async () => {
        mockAuth.mockResolvedValue({
          user: { id: "user-1", name: "Test User", role },
        });

        const response = await GET();

        expect(response.status).toBe(200);
      });
    });
  });

  describe("Manejo de errores", () => {
    it("debe manejar errores de base de datos", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", name: "Test User", role: "ADMIN" },
      });

      mockPrisma.orden.groupBy.mockRejectedValue(new Error("Database error"));

      const response = await GET();

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Error al obtener estadísticas");
    });
  });
});
