import { describe, it, expect, vi, beforeEach } from "vitest";
import { EstadoOrden, TipoNotificacion, PrioridadNotif, Role } from "@prisma/client";

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    orden: {
      findMany: vi.fn(),
    },
    notificacion: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock notification-service
vi.mock("@/lib/notificaciones/notification-service", () => ({
  notificarPorRol: vi.fn(),
  notificarUsuarios: vi.fn(),
}));

import { ejecutarCronAlertas } from "@/lib/notificaciones/alerta-cron";
import prisma from "@/lib/db/prisma";
import {
  notificarPorRol,
  notificarUsuarios,
} from "@/lib/notificaciones/notification-service";

const mockPrisma = prisma as unknown as {
  orden: {
    findMany: ReturnType<typeof vi.fn>;
  };
  notificacion: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};
const mockNotificarPorRol = notificarPorRol as ReturnType<typeof vi.fn>;
const mockNotificarUsuarios = notificarUsuarios as ReturnType<typeof vi.fn>;

// Helper to create dates relative to now
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

// Mock order factory
function createMockOrden(overrides: Record<string, unknown> = {}) {
  return {
    id: "orden-1",
    folio: "OS-2025-0001",
    estado: EstadoOrden.EN_REPARACION,
    marcaEquipo: "TORREY",
    modeloEquipo: "L-EQ 10",
    fechaRecepcion: daysAgo(2),
    fechaReparacion: null,
    tecnicoId: "tecnico-1",
    cliente: { nombre: "Cliente Test" },
    tecnico: { id: "tecnico-1", name: "Benito" },
    ...overrides,
  };
}

describe("ejecutarCronAlertas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.orden.findMany.mockResolvedValue([]);
    mockPrisma.notificacion.findFirst.mockResolvedValue(null);
    mockNotificarPorRol.mockResolvedValue(undefined);
    mockNotificarUsuarios.mockResolvedValue(undefined);
    // Suppress console.error during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("Alertas Rojas", () => {
    it("genera alerta para orden LISTO_ENTREGA con más de 5 días", async () => {
      const ordenRoja = createMockOrden({
        estado: EstadoOrden.LISTO_ENTREGA,
        fechaReparacion: daysAgo(7), // 7 días, más de 5
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenRoja]);

      const result = await ejecutarCronAlertas();

      expect(result.alertasRojas).toBe(1);
      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoNotificacion.ALERTA_ROJO,
          prioridad: PrioridadNotif.ALTA,
          roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
        })
      );
    });

    it("NO genera alerta si la orden tiene menos de 5 días", async () => {
      const ordenReciente = createMockOrden({
        estado: EstadoOrden.LISTO_ENTREGA,
        fechaReparacion: daysAgo(3), // 3 días, menos de 5
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenReciente]);

      const result = await ejecutarCronAlertas();

      expect(result.alertasRojas).toBe(0);
      expect(mockNotificarPorRol).not.toHaveBeenCalled();
    });

    it("NO genera alerta si ya existe una ALERTA_ROJO no leída para esa orden (anti-spam)", async () => {
      const ordenRoja = createMockOrden({
        estado: EstadoOrden.LISTO_ENTREGA,
        fechaReparacion: daysAgo(7),
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenRoja]);
      mockPrisma.notificacion.findFirst.mockResolvedValue({
        id: "notif-existente",
        tipo: TipoNotificacion.ALERTA_ROJO,
        leida: false,
      });

      const result = await ejecutarCronAlertas();

      expect(result.alertasRojas).toBe(0);
      expect(mockNotificarPorRol).not.toHaveBeenCalled();
    });

    it("SÍ genera nueva alerta si la anterior fue marcada como leída", async () => {
      const ordenRoja = createMockOrden({
        estado: EstadoOrden.LISTO_ENTREGA,
        fechaReparacion: daysAgo(7),
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenRoja]);
      // findFirst returns null = no unread notification
      mockPrisma.notificacion.findFirst.mockResolvedValue(null);

      const result = await ejecutarCronAlertas();

      expect(result.alertasRojas).toBe(1);
      expect(mockNotificarPorRol).toHaveBeenCalled();
    });

    it("notifica a COORD_SERVICIO y SUPER_ADMIN", async () => {
      const ordenRoja = createMockOrden({
        estado: EstadoOrden.LISTO_ENTREGA,
        fechaReparacion: daysAgo(7),
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenRoja]);

      await ejecutarCronAlertas();

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
        })
      );
    });

    it("incluye folio, marca, modelo y nombre del cliente en el mensaje", async () => {
      const ordenRoja = createMockOrden({
        id: "orden-test",
        folio: "OS-2025-0099",
        estado: EstadoOrden.LISTO_ENTREGA,
        fechaReparacion: daysAgo(7),
        marcaEquipo: "Imbera",
        modeloEquipo: "VR-17",
        cliente: { nombre: "Carnicería El Toro" },
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenRoja]);

      await ejecutarCronAlertas();

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: expect.stringContaining("OS-2025-0099"),
          mensaje: expect.stringContaining("Imbera"),
        })
      );
      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining("VR-17"),
        })
      );
      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining("Carnicería El Toro"),
        })
      );
    });

    it("usa prioridad ALTA", async () => {
      const ordenRoja = createMockOrden({
        estado: EstadoOrden.LISTO_ENTREGA,
        fechaReparacion: daysAgo(7),
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenRoja]);

      await ejecutarCronAlertas();

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          prioridad: PrioridadNotif.ALTA,
        })
      );
    });
  });

  describe("Alertas Amarillas", () => {
    it("genera alerta para orden EN_DIAGNOSTICO con más de 72h", async () => {
      const ordenAmarilla = createMockOrden({
        estado: EstadoOrden.EN_DIAGNOSTICO,
        fechaRecepcion: hoursAgo(80), // 80 horas, más de 72
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenAmarilla]);

      const result = await ejecutarCronAlertas();

      expect(result.alertasAmarillas).toBe(1);
      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoNotificacion.ALERTA_AMARILLO,
        })
      );
    });

    it("genera alerta para orden COTIZACION_PENDIENTE con más de 72h", async () => {
      const ordenAmarilla = createMockOrden({
        estado: EstadoOrden.COTIZACION_PENDIENTE,
        fechaRecepcion: hoursAgo(100),
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenAmarilla]);

      const result = await ejecutarCronAlertas();

      expect(result.alertasAmarillas).toBe(1);
    });

    it("NO genera alerta si tiene menos de 72h", async () => {
      const ordenReciente = createMockOrden({
        estado: EstadoOrden.EN_DIAGNOSTICO,
        fechaRecepcion: hoursAgo(48), // 48 horas, menos de 72
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenReciente]);

      const result = await ejecutarCronAlertas();

      expect(result.alertasAmarillas).toBe(0);
    });

    it("NO genera alerta duplicada (anti-spam)", async () => {
      const ordenAmarilla = createMockOrden({
        estado: EstadoOrden.EN_DIAGNOSTICO,
        fechaRecepcion: hoursAgo(80),
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenAmarilla]);
      mockPrisma.notificacion.findFirst.mockResolvedValue({
        id: "notif-existente",
        tipo: TipoNotificacion.ALERTA_AMARILLO,
        leida: false,
      });

      const result = await ejecutarCronAlertas();

      expect(result.alertasAmarillas).toBe(0);
      expect(mockNotificarPorRol).not.toHaveBeenCalled();
    });

    it("notifica a COORD_SERVICIO + SUPER_ADMIN + técnico asignado", async () => {
      const ordenAmarilla = createMockOrden({
        estado: EstadoOrden.EN_DIAGNOSTICO,
        fechaRecepcion: hoursAgo(80),
        tecnicoId: "tecnico-1",
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenAmarilla]);

      await ejecutarCronAlertas();

      // Should notify roles
      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
        })
      );

      // Should also notify technician
      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["tecnico-1"],
        })
      );
    });

    it("usa prioridad NORMAL", async () => {
      const ordenAmarilla = createMockOrden({
        estado: EstadoOrden.EN_DIAGNOSTICO,
        fechaRecepcion: hoursAgo(80),
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenAmarilla]);

      await ejecutarCronAlertas();

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          prioridad: PrioridadNotif.NORMAL,
        })
      );
    });
  });

  describe("Filtros", () => {
    it("ignora órdenes ENTREGADO", async () => {
      // The findMany mock should not include ENTREGADO orders
      // because the query filters them out
      mockPrisma.orden.findMany.mockResolvedValue([]);

      await ejecutarCronAlertas();

      expect(mockPrisma.orden.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            estado: {
              notIn: [EstadoOrden.ENTREGADO, EstadoOrden.CANCELADO],
            },
          },
        })
      );
    });

    it("ignora órdenes CANCELADO", async () => {
      mockPrisma.orden.findMany.mockResolvedValue([]);

      await ejecutarCronAlertas();

      expect(mockPrisma.orden.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            estado: {
              notIn: [EstadoOrden.ENTREGADO, EstadoOrden.CANCELADO],
            },
          },
        })
      );
    });

    it("procesa órdenes en LISTO_ENTREGA, EN_DIAGNOSTICO, COTIZACION_PENDIENTE", async () => {
      const ordenes = [
        createMockOrden({
          id: "orden-1",
          estado: EstadoOrden.LISTO_ENTREGA,
          fechaReparacion: daysAgo(7),
        }),
        createMockOrden({
          id: "orden-2",
          estado: EstadoOrden.EN_DIAGNOSTICO,
          fechaRecepcion: hoursAgo(80),
        }),
        createMockOrden({
          id: "orden-3",
          estado: EstadoOrden.COTIZACION_PENDIENTE,
          fechaRecepcion: hoursAgo(100),
        }),
      ];
      mockPrisma.orden.findMany.mockResolvedValue(ordenes);

      const result = await ejecutarCronAlertas();

      expect(result.alertasRojas).toBe(1);
      expect(result.alertasAmarillas).toBe(2);
    });

    it("no genera alertas para órdenes RECIBIDO, EN_REPARACION, ESPERA_REFACCIONES", async () => {
      const ordenes = [
        createMockOrden({
          id: "orden-1",
          estado: EstadoOrden.RECIBIDO,
          fechaRecepcion: daysAgo(10),
        }),
        createMockOrden({
          id: "orden-2",
          estado: EstadoOrden.EN_REPARACION,
          fechaRecepcion: daysAgo(10),
        }),
        createMockOrden({
          id: "orden-3",
          estado: EstadoOrden.ESPERA_REFACCIONES,
          fechaRecepcion: daysAgo(10),
        }),
      ];
      mockPrisma.orden.findMany.mockResolvedValue(ordenes);

      const result = await ejecutarCronAlertas();

      // These states result in VERDE or NARANJA semaphore, not ROJO or AMARILLO
      expect(result.alertasRojas).toBe(0);
      expect(result.alertasAmarillas).toBe(0);
    });
  });

  describe("Resultado", () => {
    it("devuelve conteos correctos de alertas rojas y amarillas", async () => {
      const ordenes = [
        createMockOrden({
          id: "orden-1",
          estado: EstadoOrden.LISTO_ENTREGA,
          fechaReparacion: daysAgo(7),
        }),
        createMockOrden({
          id: "orden-2",
          estado: EstadoOrden.LISTO_ENTREGA,
          fechaReparacion: daysAgo(10),
        }),
        createMockOrden({
          id: "orden-3",
          estado: EstadoOrden.EN_DIAGNOSTICO,
          fechaRecepcion: hoursAgo(80),
        }),
      ];
      mockPrisma.orden.findMany.mockResolvedValue(ordenes);

      const result = await ejecutarCronAlertas();

      expect(result.alertasRojas).toBe(2);
      expect(result.alertasAmarillas).toBe(1);
    });

    it("devuelve conteo de notificaciones creadas", async () => {
      const ordenRoja = createMockOrden({
        estado: EstadoOrden.LISTO_ENTREGA,
        fechaReparacion: daysAgo(7),
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenRoja]);

      const result = await ejecutarCronAlertas();

      expect(result.notificacionesCreadas).toBeGreaterThan(0);
    });

    it("no lanza error si una notificación individual falla", async () => {
      const ordenRoja = createMockOrden({
        estado: EstadoOrden.LISTO_ENTREGA,
        fechaReparacion: daysAgo(7),
      });
      mockPrisma.orden.findMany.mockResolvedValue([ordenRoja]);
      mockNotificarPorRol.mockRejectedValue(new Error("Notification failed"));

      const result = await ejecutarCronAlertas();

      // Should not throw, just count error
      expect(result.errores).toBeGreaterThan(0);
    });
  });
});

describe("API /api/cron/alertas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  // We need to test the route directly
  // Import after mocks are set up
  it("devuelve 401 en producción sin autorización", async () => {
    vi.stubEnv("NODE_ENV", "production");

    // Dynamic import to get fresh module with new env
    const { GET } = await import("@/app/api/cron/alertas/route");
    const request = new Request("http://localhost/api/cron/alertas");

    const response = await GET(request as unknown as import("next/server").NextRequest);

    expect(response.status).toBe(401);
  });

  it("permite acceso en desarrollo sin autorización", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockPrisma.orden.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/cron/alertas/route");
    const request = new Request("http://localhost/api/cron/alertas");

    const response = await GET(request as unknown as import("next/server").NextRequest);

    expect(response.status).toBe(200);
  });

  it("permite acceso con CRON_SECRET correcto", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "test-secret-123");
    mockPrisma.orden.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/cron/alertas/route");
    const request = new Request("http://localhost/api/cron/alertas", {
      headers: {
        authorization: "Bearer test-secret-123",
      },
    });

    const response = await GET(request as unknown as import("next/server").NextRequest);

    expect(response.status).toBe(200);
  });

  it("ejecuta el cron y devuelve resultado", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockPrisma.orden.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/cron/alertas/route");
    const request = new Request("http://localhost/api/cron/alertas");

    const response = await GET(request as unknown as import("next/server").NextRequest);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("alertasRojas");
    expect(data).toHaveProperty("alertasAmarillas");
  });

  it("devuelve 500 si el cron falla", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockPrisma.orden.findMany.mockRejectedValue(new Error("Database error"));

    const { GET } = await import("@/app/api/cron/alertas/route");
    const request = new Request("http://localhost/api/cron/alertas");

    const response = await GET(request as unknown as import("next/server").NextRequest);

    expect(response.status).toBe(500);
  });
});
