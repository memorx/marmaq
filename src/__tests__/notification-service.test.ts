import { describe, it, expect, vi, beforeEach } from "vitest";
import { TipoNotificacion, PrioridadNotif, Role } from "@prisma/client";

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    notificacion: {
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/db/prisma";
import {
  crearNotificacion,
  notificarPorRol,
  notificarUsuarios,
  marcarLeida,
  marcarTodasLeidas,
  obtenerNotificaciones,
  contarNoLeidas,
} from "@/lib/notificaciones/notification-service";

const mockPrisma = prisma as unknown as {
  notificacion: {
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  user: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("notification-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("crearNotificacion", () => {
    it("crea una notificación con todos los campos", async () => {
      mockPrisma.notificacion.create.mockResolvedValue({ id: "notif-1" });

      await crearNotificacion({
        usuarioId: "user-1",
        ordenId: "orden-1",
        tipo: TipoNotificacion.ORDEN_CREADA,
        titulo: "Nueva orden",
        mensaje: "Se ha creado la orden OS-2025-0001",
        prioridad: PrioridadNotif.ALTA,
      });

      expect(mockPrisma.notificacion.create).toHaveBeenCalledWith({
        data: {
          usuarioId: "user-1",
          ordenId: "orden-1",
          tipo: TipoNotificacion.ORDEN_CREADA,
          titulo: "Nueva orden",
          mensaje: "Se ha creado la orden OS-2025-0001",
          prioridad: PrioridadNotif.ALTA,
        },
      });
    });

    it("crea notificación sin ordenId (opcional)", async () => {
      mockPrisma.notificacion.create.mockResolvedValue({ id: "notif-1" });

      await crearNotificacion({
        usuarioId: "user-1",
        tipo: TipoNotificacion.STOCK_BAJO,
        titulo: "Stock bajo",
        mensaje: "El material X tiene stock bajo",
      });

      expect(mockPrisma.notificacion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuarioId: "user-1",
          ordenId: undefined,
          tipo: TipoNotificacion.STOCK_BAJO,
        }),
      });
    });

    it("usa prioridad NORMAL por defecto", async () => {
      mockPrisma.notificacion.create.mockResolvedValue({ id: "notif-1" });

      await crearNotificacion({
        usuarioId: "user-1",
        tipo: TipoNotificacion.ORDEN_CREADA,
        titulo: "Test",
        mensaje: "Test message",
      });

      expect(mockPrisma.notificacion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prioridad: PrioridadNotif.NORMAL,
        }),
      });
    });

    it("no lanza error si falla (best effort)", async () => {
      mockPrisma.notificacion.create.mockRejectedValue(new Error("DB Error"));

      // No debe lanzar error
      await expect(
        crearNotificacion({
          usuarioId: "user-1",
          tipo: TipoNotificacion.ORDEN_CREADA,
          titulo: "Test",
          mensaje: "Test",
        })
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("notificarPorRol", () => {
    it("crea notificaciones para todos los usuarios con el rol", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user-1" },
        { id: "user-2" },
        { id: "user-3" },
      ]);
      mockPrisma.notificacion.createMany.mockResolvedValue({ count: 3 });

      await notificarPorRol({
        roles: [Role.SUPER_ADMIN],
        tipo: TipoNotificacion.ORDEN_CREADA,
        titulo: "Nueva orden",
        mensaje: "Mensaje",
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: { in: [Role.SUPER_ADMIN] },
          activo: true,
        },
        select: { id: true },
      });

      expect(mockPrisma.notificacion.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ usuarioId: "user-1" }),
          expect.objectContaining({ usuarioId: "user-2" }),
          expect.objectContaining({ usuarioId: "user-3" }),
        ],
      });
    });

    it("excluye al usuario especificado en excluirUsuarioId", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user-1" },
        { id: "user-2" },
      ]);
      mockPrisma.notificacion.createMany.mockResolvedValue({ count: 2 });

      await notificarPorRol({
        roles: [Role.COORD_SERVICIO],
        tipo: TipoNotificacion.ORDEN_CREADA,
        titulo: "Nueva orden",
        mensaje: "Mensaje",
        excluirUsuarioId: "user-excluded",
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: { in: [Role.COORD_SERVICIO] },
          activo: true,
          id: { not: "user-excluded" },
        },
        select: { id: true },
      });
    });

    it("notifica a múltiples roles al mismo tiempo", async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1" }]);
      mockPrisma.notificacion.createMany.mockResolvedValue({ count: 1 });

      await notificarPorRol({
        roles: [Role.SUPER_ADMIN, Role.COORD_SERVICIO],
        tipo: TipoNotificacion.ALERTA_ROJO,
        titulo: "Alerta",
        mensaje: "Mensaje",
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          role: { in: [Role.SUPER_ADMIN, Role.COORD_SERVICIO] },
        }),
        select: { id: true },
      });
    });

    it("no crea notificaciones si no hay usuarios con ese rol", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await notificarPorRol({
        roles: [Role.TECNICO],
        tipo: TipoNotificacion.ORDEN_CREADA,
        titulo: "Test",
        mensaje: "Test",
      });

      expect(mockPrisma.notificacion.createMany).not.toHaveBeenCalled();
    });

    it("solo notifica a usuarios activos", async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: "user-active" }]);
      mockPrisma.notificacion.createMany.mockResolvedValue({ count: 1 });

      await notificarPorRol({
        roles: [Role.TECNICO],
        tipo: TipoNotificacion.ORDEN_CREADA,
        titulo: "Test",
        mensaje: "Test",
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          activo: true,
        }),
        select: { id: true },
      });
    });
  });

  describe("notificarUsuarios", () => {
    it("crea notificaciones para los usuarios especificados", async () => {
      mockPrisma.notificacion.createMany.mockResolvedValue({ count: 2 });

      await notificarUsuarios({
        usuarioIds: ["user-1", "user-2"],
        tipo: TipoNotificacion.TECNICO_REASIGNADO,
        titulo: "Reasignación",
        mensaje: "Has sido asignado a una orden",
      });

      expect(mockPrisma.notificacion.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ usuarioId: "user-1" }),
          expect.objectContaining({ usuarioId: "user-2" }),
        ],
      });
    });

    it("excluye al usuario en excluirUsuarioId", async () => {
      mockPrisma.notificacion.createMany.mockResolvedValue({ count: 1 });

      await notificarUsuarios({
        usuarioIds: ["user-1", "user-2", "user-excluded"],
        tipo: TipoNotificacion.ESTADO_CAMBIADO,
        titulo: "Estado cambiado",
        mensaje: "Mensaje",
        excluirUsuarioId: "user-excluded",
      });

      expect(mockPrisma.notificacion.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ usuarioId: "user-1" }),
          expect.objectContaining({ usuarioId: "user-2" }),
        ],
      });
    });

    it("no falla con array vacío de usuarios", async () => {
      await notificarUsuarios({
        usuarioIds: [],
        tipo: TipoNotificacion.ORDEN_CREADA,
        titulo: "Test",
        mensaje: "Test",
      });

      expect(mockPrisma.notificacion.createMany).not.toHaveBeenCalled();
    });
  });

  describe("marcarLeida", () => {
    it("marca una notificación como leída y guarda fechaLeida", async () => {
      mockPrisma.notificacion.updateMany.mockResolvedValue({ count: 1 });

      const result = await marcarLeida("notif-1", "user-1");

      expect(result).toBe(true);
      expect(mockPrisma.notificacion.updateMany).toHaveBeenCalledWith({
        where: {
          id: "notif-1",
          usuarioId: "user-1",
          leida: false,
        },
        data: {
          leida: true,
          fechaLeida: expect.any(Date),
        },
      });
    });

    it("no marca si la notificación no pertenece al usuario", async () => {
      mockPrisma.notificacion.updateMany.mockResolvedValue({ count: 0 });

      const result = await marcarLeida("notif-1", "wrong-user");

      expect(result).toBe(false);
    });
  });

  describe("marcarTodasLeidas", () => {
    it("marca todas las no leídas del usuario", async () => {
      mockPrisma.notificacion.updateMany.mockResolvedValue({ count: 5 });

      const result = await marcarTodasLeidas("user-1");

      expect(result).toBe(5);
      expect(mockPrisma.notificacion.updateMany).toHaveBeenCalledWith({
        where: {
          usuarioId: "user-1",
          leida: false,
        },
        data: {
          leida: true,
          fechaLeida: expect.any(Date),
        },
      });
    });

    it("no afecta notificaciones de otros usuarios", async () => {
      mockPrisma.notificacion.updateMany.mockResolvedValue({ count: 3 });

      await marcarTodasLeidas("user-1");

      expect(mockPrisma.notificacion.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          usuarioId: "user-1",
        }),
        data: expect.any(Object),
      });
    });
  });

  describe("obtenerNotificaciones", () => {
    const mockNotificaciones = [
      {
        id: "notif-1",
        tipo: TipoNotificacion.ALERTA_ROJO,
        titulo: "Alerta",
        mensaje: "Mensaje 1",
        prioridad: PrioridadNotif.ALTA,
        leida: false,
        fechaLeida: null,
        ordenId: "orden-1",
        orden: { id: "orden-1", folio: "OS-2025-0001" },
        createdAt: new Date("2025-02-04T12:00:00Z"),
      },
      {
        id: "notif-2",
        tipo: TipoNotificacion.ORDEN_CREADA,
        titulo: "Nueva orden",
        mensaje: "Mensaje 2",
        prioridad: PrioridadNotif.NORMAL,
        leida: true,
        fechaLeida: new Date("2025-02-03T10:00:00Z"),
        ordenId: null,
        orden: null,
        createdAt: new Date("2025-02-03T09:00:00Z"),
      },
    ];

    it("devuelve notificaciones ordenadas por fecha desc", async () => {
      mockPrisma.notificacion.findMany.mockResolvedValue(mockNotificaciones);

      const result = await obtenerNotificaciones("user-1");

      expect(mockPrisma.notificacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
      expect(result.notificaciones).toHaveLength(2);
    });

    it("filtra solo no leídas si se especifica", async () => {
      mockPrisma.notificacion.findMany.mockResolvedValue([mockNotificaciones[0]]);

      await obtenerNotificaciones("user-1", { soloNoLeidas: true });

      expect(mockPrisma.notificacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leida: false,
          }),
        })
      );
    });

    it("respeta el limit", async () => {
      mockPrisma.notificacion.findMany.mockResolvedValue([]);

      await obtenerNotificaciones("user-1", { limit: 10 });

      expect(mockPrisma.notificacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 11, // limit + 1 for pagination check
        })
      );
    });

    it("implementa paginación con cursor", async () => {
      const cursor = "2025-02-04T12:00:00.000Z";
      mockPrisma.notificacion.findMany.mockResolvedValue([]);

      await obtenerNotificaciones("user-1", { cursor });

      expect(mockPrisma.notificacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lt: new Date(cursor) },
          }),
        })
      );
    });

    it("incluye datos de la orden relacionada", async () => {
      mockPrisma.notificacion.findMany.mockResolvedValue(mockNotificaciones);

      const result = await obtenerNotificaciones("user-1");

      expect(mockPrisma.notificacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            orden: {
              select: {
                id: true,
                folio: true,
              },
            },
          },
        })
      );

      expect(result.notificaciones[0].orden).toEqual({
        id: "orden-1",
        folio: "OS-2025-0001",
      });
    });
  });

  describe("contarNoLeidas", () => {
    it("cuenta correctamente las no leídas", async () => {
      mockPrisma.notificacion.count.mockResolvedValue(7);

      const result = await contarNoLeidas("user-1");

      expect(result).toBe(7);
      expect(mockPrisma.notificacion.count).toHaveBeenCalledWith({
        where: {
          usuarioId: "user-1",
          leida: false,
        },
      });
    });

    it("devuelve 0 si todas están leídas", async () => {
      mockPrisma.notificacion.count.mockResolvedValue(0);

      const result = await contarNoLeidas("user-1");

      expect(result).toBe(0);
    });
  });
});
