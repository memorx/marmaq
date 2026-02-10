import { describe, it, expect, vi, beforeEach } from "vitest";
import { EstadoOrden, Role, TipoNotificacion, PrioridadNotif } from "@prisma/client";

// Mock notification-service
vi.mock("@/lib/notificaciones/notification-service", () => ({
  notificarPorRol: vi.fn(),
  notificarUsuarios: vi.fn(),
}));

import {
  notificarOrdenCreada,
  notificarCambioEstado,
  notificarOrdenCancelada,
  notificarTecnicoReasignado,
  notificarPrioridadUrgente,
  notificarCotizacionModificada,
} from "@/lib/notificaciones/notification-triggers";
import {
  notificarPorRol,
  notificarUsuarios,
} from "@/lib/notificaciones/notification-service";

const mockNotificarPorRol = notificarPorRol as ReturnType<typeof vi.fn>;
const mockNotificarUsuarios = notificarUsuarios as ReturnType<typeof vi.fn>;

const ordenBasica = {
  id: "orden-1",
  folio: "OS-2025-0001",
  tecnicoId: "tecnico-1",
  marcaEquipo: "TORREY",
  modeloEquipo: "L-EQ 10",
};

describe("notification-triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificarPorRol.mockResolvedValue(undefined);
    mockNotificarUsuarios.mockResolvedValue(undefined);
    // Suppress console.error during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("notificarOrdenCreada", () => {
    it("notifica a COORD_SERVICIO (no a SUPER_ADMIN)", async () => {
      await notificarOrdenCreada(ordenBasica, "user-creador");

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.COORD_SERVICIO],
          tipo: TipoNotificacion.ORDEN_CREADA,
        })
      );
    });

    it("excluye al creador de la notificación", async () => {
      await notificarOrdenCreada(ordenBasica, "user-creador");

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          excluirUsuarioId: "user-creador",
        })
      );
    });

    it("incluye folio y equipo en el mensaje", async () => {
      await notificarOrdenCreada(ordenBasica, "user-creador");

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining("OS-2025-0001"),
          ordenId: "orden-1",
        })
      );
      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining("TORREY"),
        })
      );
    });

    it("no lanza error si el servicio falla", async () => {
      mockNotificarPorRol.mockRejectedValue(new Error("Service error"));

      await expect(
        notificarOrdenCreada(ordenBasica, "user-creador")
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("notificarCambioEstado", () => {
    it("al cambiar a ESPERA_REFACCIONES notifica a REFACCIONES + COORD_SERVICIO", async () => {
      await notificarCambioEstado(
        ordenBasica,
        EstadoOrden.EN_DIAGNOSTICO,
        EstadoOrden.ESPERA_REFACCIONES,
        "user-1"
      );

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.REFACCIONES, Role.COORD_SERVICIO],
          tipo: TipoNotificacion.ESTADO_CAMBIADO,
          prioridad: PrioridadNotif.ALTA,
        })
      );
    });

    it("al cambiar a REPARADO notifica a COORD_SERVICIO (no a SUPER_ADMIN)", async () => {
      await notificarCambioEstado(
        ordenBasica,
        EstadoOrden.EN_REPARACION,
        EstadoOrden.REPARADO,
        "user-1"
      );

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.COORD_SERVICIO],
          titulo: expect.stringContaining("Reparación completada"),
        })
      );
    });

    it("al cambiar a EN_DIAGNOSTICO notifica al técnico asignado", async () => {
      await notificarCambioEstado(
        ordenBasica,
        EstadoOrden.RECIBIDO,
        EstadoOrden.EN_DIAGNOSTICO,
        "user-1"
      );

      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["tecnico-1"],
          titulo: expect.stringContaining("diagnóstico"),
        })
      );
    });

    it("al cambiar a EN_REPARACION notifica al técnico asignado", async () => {
      await notificarCambioEstado(
        ordenBasica,
        EstadoOrden.ESPERA_REFACCIONES,
        EstadoOrden.EN_REPARACION,
        "user-1"
      );

      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["tecnico-1"],
          titulo: expect.stringContaining("reparación"),
        })
      );
    });

    it("al cambiar a LISTO_ENTREGA notifica a COORD_SERVICIO (no a SUPER_ADMIN)", async () => {
      await notificarCambioEstado(
        ordenBasica,
        EstadoOrden.REPARADO,
        EstadoOrden.LISTO_ENTREGA,
        "user-1"
      );

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.COORD_SERVICIO],
          titulo: expect.stringContaining("lista para entrega"),
        })
      );
    });

    it("al cambiar a ENTREGADO notifica a COORD_SERVICIO (no a SUPER_ADMIN)", async () => {
      await notificarCambioEstado(
        ordenBasica,
        EstadoOrden.LISTO_ENTREGA,
        EstadoOrden.ENTREGADO,
        "user-1"
      );

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.COORD_SERVICIO],
          titulo: expect.stringContaining("entregada"),
        })
      );
    });

    it("no notifica si no hay técnico asignado (cuando se requiere)", async () => {
      const ordenSinTecnico = { ...ordenBasica, tecnicoId: null };

      await notificarCambioEstado(
        ordenSinTecnico,
        EstadoOrden.RECIBIDO,
        EstadoOrden.EN_DIAGNOSTICO,
        "user-1"
      );

      expect(mockNotificarUsuarios).not.toHaveBeenCalled();
    });

    it("excluye a quien hizo el cambio", async () => {
      await notificarCambioEstado(
        ordenBasica,
        EstadoOrden.EN_REPARACION,
        EstadoOrden.REPARADO,
        "user-cambio"
      );

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          excluirUsuarioId: "user-cambio",
        })
      );
    });

    it("no lanza error si el servicio falla", async () => {
      mockNotificarPorRol.mockRejectedValue(new Error("Service error"));

      await expect(
        notificarCambioEstado(
          ordenBasica,
          EstadoOrden.EN_REPARACION,
          EstadoOrden.REPARADO,
          "user-1"
        )
      ).resolves.not.toThrow();
    });

    it("al cambiar a REPARADO notifica al creador de la orden", async () => {
      const ordenConCreador = { ...ordenBasica, creadoPorId: "vendedor-1" };
      await notificarCambioEstado(
        ordenConCreador,
        EstadoOrden.EN_REPARACION,
        EstadoOrden.REPARADO,
        "tecnico-1"
      );

      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["vendedor-1"],
          titulo: expect.stringContaining("reparada"),
        })
      );
    });

    it("al cambiar a LISTO_ENTREGA notifica al creador de la orden", async () => {
      const ordenConCreador = { ...ordenBasica, creadoPorId: "vendedor-1" };
      await notificarCambioEstado(
        ordenConCreador,
        EstadoOrden.REPARADO,
        EstadoOrden.LISTO_ENTREGA,
        "admin-1"
      );

      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["vendedor-1"],
          titulo: expect.stringContaining("lista para entrega"),
        })
      );
    });

    it("al cambiar a REPARADO NO notifica al creador si ÉL hizo el cambio", async () => {
      const ordenConCreador = { ...ordenBasica, creadoPorId: "vendedor-1" };
      await notificarCambioEstado(
        ordenConCreador,
        EstadoOrden.EN_REPARACION,
        EstadoOrden.REPARADO,
        "vendedor-1"
      );

      const vendedorCalls = mockNotificarUsuarios.mock.calls.filter(
        (c: unknown[]) => {
          const arg = c[0] as { usuarioIds: string[]; titulo: string };
          return arg.usuarioIds.includes("vendedor-1") && arg.titulo.includes("reparada");
        }
      );
      expect(vendedorCalls.length).toBe(0);
    });

    it("no notifica si el nuevo estado es CANCELADO", async () => {
      await notificarCambioEstado(
        ordenBasica,
        EstadoOrden.EN_DIAGNOSTICO,
        EstadoOrden.CANCELADO,
        "user-1"
      );

      expect(mockNotificarPorRol).not.toHaveBeenCalled();
      expect(mockNotificarUsuarios).not.toHaveBeenCalled();
    });
  });

  describe("notificarOrdenCancelada", () => {
    const ordenConEstado = {
      ...ordenBasica,
      estado: EstadoOrden.EN_DIAGNOSTICO,
    };

    it("notifica al técnico asignado", async () => {
      await notificarOrdenCancelada(ordenConEstado, "user-cancela");

      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["tecnico-1"],
          tipo: TipoNotificacion.ORDEN_CANCELADA,
          prioridad: PrioridadNotif.ALTA,
        })
      );
    });

    it("notifica a COORD_SERVICIO y SUPER_ADMIN", async () => {
      await notificarOrdenCancelada(ordenConEstado, "user-cancela");

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
          tipo: TipoNotificacion.ORDEN_CANCELADA,
        })
      );
    });

    it("notifica a REFACCIONES si estaba en ESPERA_REFACCIONES", async () => {
      const ordenEnEspera = {
        ...ordenBasica,
        estado: EstadoOrden.ESPERA_REFACCIONES,
      };

      await notificarOrdenCancelada(ordenEnEspera, "user-cancela");

      // Debe haber una llamada específica a REFACCIONES
      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.REFACCIONES],
          titulo: expect.stringContaining("refacciones ya no requeridas"),
        })
      );
    });

    it("no notifica a REFACCIONES si no estaba en ESPERA_REFACCIONES", async () => {
      await notificarOrdenCancelada(ordenConEstado, "user-cancela");

      // No debe haber llamada con solo REFACCIONES
      const llamadasConSoloRefacciones = mockNotificarPorRol.mock.calls.filter(
        (call) =>
          call[0].roles.length === 1 && call[0].roles[0] === Role.REFACCIONES
      );
      expect(llamadasConSoloRefacciones).toHaveLength(0);
    });

    it("excluye a quien canceló", async () => {
      await notificarOrdenCancelada(ordenConEstado, "user-cancela");

      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          excluirUsuarioId: "user-cancela",
        })
      );
      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          excluirUsuarioId: "user-cancela",
        })
      );
    });

    it("no lanza error si el servicio falla", async () => {
      mockNotificarUsuarios.mockRejectedValue(new Error("Service error"));

      await expect(
        notificarOrdenCancelada(ordenConEstado, "user-cancela")
      ).resolves.not.toThrow();
    });
  });

  describe("notificarTecnicoReasignado", () => {
    it("notifica al técnico anterior y al nuevo", async () => {
      await notificarTecnicoReasignado(
        ordenBasica,
        "tecnico-anterior",
        "tecnico-nuevo",
        "user-admin"
      );

      // Notificación al técnico anterior
      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["tecnico-anterior"],
          titulo: expect.stringContaining("reasignada"),
        })
      );

      // Notificación al técnico nuevo
      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["tecnico-nuevo"],
          titulo: expect.stringContaining("asignada"),
        })
      );
    });

    it("no notifica al técnico anterior si era null", async () => {
      await notificarTecnicoReasignado(
        ordenBasica,
        null,
        "tecnico-nuevo",
        "user-admin"
      );

      // Solo debe notificar al nuevo
      expect(mockNotificarUsuarios).toHaveBeenCalledTimes(1);
      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["tecnico-nuevo"],
        })
      );
    });

    it("no notifica al técnico nuevo si es null", async () => {
      await notificarTecnicoReasignado(
        ordenBasica,
        "tecnico-anterior",
        null,
        "user-admin"
      );

      // Solo debe notificar al anterior
      expect(mockNotificarUsuarios).toHaveBeenCalledTimes(1);
      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["tecnico-anterior"],
        })
      );
    });

    it("excluye a quien hizo el cambio", async () => {
      await notificarTecnicoReasignado(
        ordenBasica,
        "tecnico-anterior",
        "tecnico-nuevo",
        "user-admin"
      );

      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          excluirUsuarioId: "user-admin",
        })
      );
    });

    it("no notifica si ambos técnicos son null", async () => {
      await notificarTecnicoReasignado(ordenBasica, null, null, "user-admin");

      expect(mockNotificarUsuarios).not.toHaveBeenCalled();
    });
  });

  describe("notificarPrioridadUrgente", () => {
    it("notifica al técnico asignado", async () => {
      await notificarPrioridadUrgente(ordenBasica, "user-admin");

      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioIds: ["tecnico-1"],
          tipo: TipoNotificacion.PRIORIDAD_URGENTE,
          titulo: expect.stringContaining("URGENTE"),
        })
      );
    });

    it("no notifica si no hay técnico asignado", async () => {
      const ordenSinTecnico = { ...ordenBasica, tecnicoId: null };

      await notificarPrioridadUrgente(ordenSinTecnico, "user-admin");

      expect(mockNotificarUsuarios).not.toHaveBeenCalled();
    });

    it("usa prioridad URGENTE", async () => {
      await notificarPrioridadUrgente(ordenBasica, "user-admin");

      expect(mockNotificarUsuarios).toHaveBeenCalledWith(
        expect.objectContaining({
          prioridad: PrioridadNotif.URGENTE,
        })
      );
    });
  });

  describe("notificarCotizacionModificada", () => {
    it("notifica a COORD_SERVICIO y SUPER_ADMIN", async () => {
      await notificarCotizacionModificada(ordenBasica, 1000, 1500, "user-1");

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.COORD_SERVICIO, Role.SUPER_ADMIN],
          tipo: TipoNotificacion.COTIZACION_MODIFICADA,
        })
      );
    });

    it("incluye monto anterior y nuevo en el mensaje", async () => {
      await notificarCotizacionModificada(ordenBasica, 1000, 1500, "user-1");

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining("$1,000"),
        })
      );
      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining("$1,500"),
        })
      );
    });

    it("excluye a quien modificó", async () => {
      await notificarCotizacionModificada(
        ordenBasica,
        1000,
        1500,
        "user-modificador"
      );

      expect(mockNotificarPorRol).toHaveBeenCalledWith(
        expect.objectContaining({
          excluirUsuarioId: "user-modificador",
        })
      );
    });
  });
});
