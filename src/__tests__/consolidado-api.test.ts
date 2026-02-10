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
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/reportes/consolidado/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: {
    findMany: ReturnType<typeof vi.fn>;
  };
  user: {
    findMany: ReturnType<typeof vi.fn>;
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
    serieEquipo: null,
    fechaRecepcion: new Date("2025-02-10"),
    fechaReparacion: null,
    fechaEntrega: null,
    fechaPromesa: null,
    cotizacion: null,
    cotizacionAprobada: false,
    tecnicoId: "tec-1",
    clienteId: "cli-1",
    cliente: { nombre: "Cliente Test", empresa: null },
    tecnico: { id: "tec-1", name: "Técnico 1" },
    ...overrides,
  };
}

function createRequest(mes?: string): NextRequest {
  const url = mes
    ? `http://localhost:3000/api/reportes/consolidado?mes=${mes}`
    : "http://localhost:3000/api/reportes/consolidado";
  return new NextRequest(url);
}

describe("GET /api/reportes/consolidado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.orden.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
  });

  // ============ AUTH ============
  describe("Autenticación y autorización", () => {
    it("devuelve 401 sin sesión", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET(createRequest("2025-02"));

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("No autorizado");
    });

    it("devuelve 401 sin usuario en sesión", async () => {
      mockAuth.mockResolvedValue({ user: null });

      const response = await GET(createRequest("2025-02"));

      expect(response.status).toBe(401);
    });

    it("devuelve 403 para TECNICO", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "u1", role: "TECNICO", email: "t@t.com", name: "Tec" },
      });

      const response = await GET(createRequest("2025-02"));

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Sin permisos");
    });

    it("devuelve 403 para VENDEDOR", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "u1", role: "VENDEDOR", email: "v@v.com", name: "Vend" },
      });

      const response = await GET(createRequest("2025-02"));

      expect(response.status).toBe(403);
    });

    it("permite acceso a SUPER_ADMIN", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "u1", role: "SUPER_ADMIN", email: "a@a.com", name: "Admin" },
      });

      const response = await GET(createRequest("2025-02"));

      expect(response.status).toBe(200);
    });

    it("permite acceso a COORD_SERVICIO", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "u1", role: "COORD_SERVICIO", email: "c@c.com", name: "Coord" },
      });

      const response = await GET(createRequest("2025-02"));

      expect(response.status).toBe(200);
    });
  });

  // ============ PARÁMETROS ============
  describe("Parámetros", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "u1", role: "SUPER_ADMIN", email: "a@a.com", name: "Admin" },
      });
    });

    it("usa el mes actual por defecto si no se envía parámetro", async () => {
      const response = await GET(createRequest());
      const data = await response.json();

      const now = new Date();
      expect(data.periodo.anio).toBe(now.getFullYear());
      expect(data.periodo.mes).toBe(String(now.getMonth() + 1).padStart(2, "0"));
    });

    it("parsea correctamente el parámetro mes YYYY-MM", async () => {
      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      expect(data.periodo.anio).toBe(2025);
      expect(data.periodo.mes).toBe("02");
      expect(data.periodo.label).toBe("Febrero 2025");
    });

    it("devuelve 400 para mes inválido", async () => {
      const response = await GET(createRequest("2025-13"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("inválido");
    });
  });

  // ============ RESPUESTA ============
  describe("Forma de la respuesta", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "u1", role: "SUPER_ADMIN", email: "a@a.com", name: "Admin" },
      });
    });

    it("contiene todas las secciones esperadas", async () => {
      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      expect(data).toHaveProperty("periodo");
      expect(data).toHaveProperty("resumen");
      expect(data).toHaveProperty("porTipoServicio");
      expect(data).toHaveProperty("porTecnico");
      expect(data).toHaveProperty("porEstado");
      expect(data).toHaveProperty("semaforo");
      expect(data).toHaveProperty("ordenesCriticas");
    });

    it("resumen tiene los campos correctos", async () => {
      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      expect(data.resumen).toHaveProperty("totalOrdenes");
      expect(data.resumen).toHaveProperty("entregadas");
      expect(data.resumen).toHaveProperty("canceladas");
      expect(data.resumen).toHaveProperty("enProceso");
      expect(data.resumen).toHaveProperty("ingresosTotales");
    });

    it("semaforo tiene los 5 colores", async () => {
      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      expect(data.semaforo).toHaveProperty("rojo");
      expect(data.semaforo).toHaveProperty("naranja");
      expect(data.semaforo).toHaveProperty("amarillo");
      expect(data.semaforo).toHaveProperty("verde");
      expect(data.semaforo).toHaveProperty("azul");
    });

    it("porTipoServicio tiene los 4 tipos", async () => {
      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      expect(data.porTipoServicio).toHaveLength(4);
      const tipos = data.porTipoServicio.map((t: { tipo: string }) => t.tipo);
      expect(tipos).toContain("GARANTIA");
      expect(tipos).toContain("CENTRO_SERVICIO");
      expect(tipos).toContain("POR_COBRAR");
      expect(tipos).toContain("REPARE");
    });
  });

  // ============ CÁLCULOS ============
  describe("Cálculos", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "u1", role: "SUPER_ADMIN", email: "a@a.com", name: "Admin" },
      });
    });

    it("cuenta correctamente entregadas, canceladas y en proceso", async () => {
      mockPrisma.orden.findMany.mockResolvedValue([
        createMockOrden({ id: "o1", estado: "ENTREGADO" }),
        createMockOrden({ id: "o2", estado: "ENTREGADO" }),
        createMockOrden({ id: "o3", estado: "CANCELADO" }),
        createMockOrden({ id: "o4", estado: "EN_REPARACION" }),
        createMockOrden({ id: "o5", estado: "RECIBIDO" }),
      ]);

      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      expect(data.resumen.totalOrdenes).toBe(5);
      expect(data.resumen.entregadas).toBe(2);
      expect(data.resumen.canceladas).toBe(1);
      expect(data.resumen.enProceso).toBe(2);
    });

    it("calcula ingresosTotales solo de POR_COBRAR + ENTREGADO + cotizacionAprobada", async () => {
      mockPrisma.orden.findMany.mockResolvedValue([
        // Debe contar: POR_COBRAR + ENTREGADO + aprobada
        createMockOrden({
          id: "o1",
          estado: "ENTREGADO",
          tipoServicio: "POR_COBRAR",
          cotizacion: 1500,
          cotizacionAprobada: true,
        }),
        // NO debe contar: ENTREGADO pero no POR_COBRAR
        createMockOrden({
          id: "o2",
          estado: "ENTREGADO",
          tipoServicio: "GARANTIA",
          cotizacion: 500,
          cotizacionAprobada: true,
        }),
        // NO debe contar: POR_COBRAR pero no ENTREGADO
        createMockOrden({
          id: "o3",
          estado: "EN_REPARACION",
          tipoServicio: "POR_COBRAR",
          cotizacion: 2000,
          cotizacionAprobada: true,
        }),
        // NO debe contar: POR_COBRAR + ENTREGADO pero no aprobada
        createMockOrden({
          id: "o4",
          estado: "ENTREGADO",
          tipoServicio: "POR_COBRAR",
          cotizacion: 3000,
          cotizacionAprobada: false,
        }),
      ]);

      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      expect(data.resumen.ingresosTotales).toBe(1500);
    });

    it("agrupa correctamente por tipo de servicio", async () => {
      mockPrisma.orden.findMany.mockResolvedValue([
        createMockOrden({ id: "o1", tipoServicio: "GARANTIA" }),
        createMockOrden({ id: "o2", tipoServicio: "GARANTIA" }),
        createMockOrden({ id: "o3", tipoServicio: "POR_COBRAR" }),
        createMockOrden({ id: "o4", tipoServicio: "REPARE" }),
      ]);

      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      const garantia = data.porTipoServicio.find((t: { tipo: string }) => t.tipo === "GARANTIA");
      const porCobrar = data.porTipoServicio.find((t: { tipo: string }) => t.tipo === "POR_COBRAR");
      const repare = data.porTipoServicio.find((t: { tipo: string }) => t.tipo === "REPARE");
      const centro = data.porTipoServicio.find((t: { tipo: string }) => t.tipo === "CENTRO_SERVICIO");

      expect(garantia.cantidad).toBe(2);
      expect(porCobrar.cantidad).toBe(1);
      expect(repare.cantidad).toBe(1);
      expect(centro.cantidad).toBe(0);
    });

    it("calcula métricas por técnico correctamente", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "tec-1", name: "Carlos" },
        { id: "tec-2", name: "Maria" },
      ]);

      const hace5Dias = new Date("2025-02-05");
      mockPrisma.orden.findMany.mockResolvedValue([
        createMockOrden({
          id: "o1",
          tecnicoId: "tec-1",
          estado: "ENTREGADO",
          fechaRecepcion: hace5Dias,
          fechaEntrega: new Date("2025-02-10"),
        }),
        createMockOrden({ id: "o2", tecnicoId: "tec-1", estado: "EN_REPARACION" }),
        createMockOrden({
          id: "o3",
          tecnicoId: "tec-2",
          estado: "ENTREGADO",
          fechaRecepcion: hace5Dias,
          fechaEntrega: new Date("2025-02-08"),
        }),
      ]);

      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      const carlos = data.porTecnico.find((t: { tecnicoId: string }) => t.tecnicoId === "tec-1");
      const maria = data.porTecnico.find((t: { tecnicoId: string }) => t.tecnicoId === "tec-2");

      expect(carlos.asignadas).toBe(2);
      expect(carlos.completadas).toBe(1);
      expect(carlos.tiempoPromedioDias).toBe(5); // 5 days

      expect(maria.asignadas).toBe(1);
      expect(maria.completadas).toBe(1);
      expect(maria.tiempoPromedioDias).toBe(3); // 3 days
    });

    it("detecta órdenes críticas (semáforo ROJO)", async () => {
      const hace10Dias = new Date();
      hace10Dias.setDate(hace10Dias.getDate() - 10);

      mockPrisma.orden.findMany.mockResolvedValue([
        // ROJO: LISTO_ENTREGA con >5 días desde reparación
        createMockOrden({
          id: "critica-1",
          folio: "OS-2025-0099",
          estado: "LISTO_ENTREGA",
          fechaRecepcion: hace10Dias,
          fechaReparacion: hace10Dias,
          cliente: { nombre: "Cliente Urgente", empresa: null },
        }),
        // VERDE: EN_REPARACION normal
        createMockOrden({
          id: "normal-1",
          estado: "EN_REPARACION",
          fechaRecepcion: new Date(),
        }),
      ]);

      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      expect(data.semaforo.rojo).toBe(1);
      expect(data.ordenesCriticas).toHaveLength(1);
      expect(data.ordenesCriticas[0].folio).toBe("OS-2025-0099");
      expect(data.ordenesCriticas[0].cliente).toBe("Cliente Urgente");
      expect(data.ordenesCriticas[0].diasEnTaller).toBeGreaterThanOrEqual(10);
    });

    it("cuenta semáforo correctamente para distintos estados", async () => {
      const hace5Dias = new Date();
      hace5Dias.setDate(hace5Dias.getDate() - 5);

      mockPrisma.orden.findMany.mockResolvedValue([
        // NARANJA: ESPERA_REFACCIONES
        createMockOrden({
          id: "o1",
          estado: "ESPERA_REFACCIONES",
          fechaRecepcion: new Date(),
        }),
        // VERDE: EN_REPARACION reciente
        createMockOrden({
          id: "o2",
          estado: "EN_REPARACION",
          fechaRecepcion: new Date(),
        }),
        // AMARILLO: EN_DIAGNOSTICO > 72h
        createMockOrden({
          id: "o3",
          estado: "EN_DIAGNOSTICO",
          fechaRecepcion: hace5Dias,
        }),
        // Excluido del semáforo: ENTREGADO
        createMockOrden({
          id: "o4",
          estado: "ENTREGADO",
          fechaRecepcion: new Date(),
        }),
      ]);

      const response = await GET(createRequest("2025-02"));
      const data = await response.json();

      expect(data.semaforo.naranja).toBe(1);
      expect(data.semaforo.verde).toBe(1);
      expect(data.semaforo.amarillo).toBe(1);
      // ENTREGADO is excluded from semaforo count
      const total = data.semaforo.rojo + data.semaforo.naranja + data.semaforo.amarillo + data.semaforo.verde + data.semaforo.azul;
      expect(total).toBe(3);
    });
  });

  // ============ MES VACÍO ============
  describe("Mes sin datos", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "u1", role: "SUPER_ADMIN", email: "a@a.com", name: "Admin" },
      });
    });

    it("retorna ceros y arrays vacíos para un mes sin órdenes", async () => {
      const response = await GET(createRequest("2024-01"));
      const data = await response.json();

      expect(data.resumen.totalOrdenes).toBe(0);
      expect(data.resumen.entregadas).toBe(0);
      expect(data.resumen.canceladas).toBe(0);
      expect(data.resumen.enProceso).toBe(0);
      expect(data.resumen.ingresosTotales).toBe(0);
      expect(data.porEstado).toHaveLength(0);
      expect(data.ordenesCriticas).toHaveLength(0);
      expect(data.semaforo.rojo).toBe(0);
      expect(data.semaforo.naranja).toBe(0);
      expect(data.semaforo.amarillo).toBe(0);
      expect(data.semaforo.verde).toBe(0);
      expect(data.semaforo.azul).toBe(0);
    });
  });
});
