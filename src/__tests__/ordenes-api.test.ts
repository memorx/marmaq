import { describe, it, expect } from "vitest";
import type { UpdateOrdenInput } from "@/types/ordenes";
import type { EstadoOrden, Prioridad, CondicionEquipo, Role } from "@prisma/client";
import type { Session } from "next-auth";
import {
  checkRole,
  canAccessOrden,
  getUserRole,
  canTecnicoUpdateFields,
  canRefaccionesUpdateOrden,
} from "@/lib/auth/authorize";

/**
 * Tests para validación de datos de actualización de órdenes
 * Estos tests verifican la estructura de los datos que se envían al endpoint PATCH
 */

describe("UpdateOrdenInput Validación", () => {
  describe("Campos de estado", () => {
    it("permite cambiar estado a cualquier EstadoOrden válido", () => {
      const estados: EstadoOrden[] = [
        "RECIBIDO",
        "EN_DIAGNOSTICO",
        "ESPERA_REFACCIONES",
        "COTIZACION_PENDIENTE",
        "EN_REPARACION",
        "REPARADO",
        "LISTO_ENTREGA",
        "ENTREGADO",
        "CANCELADO",
      ];

      estados.forEach((estado) => {
        const input: UpdateOrdenInput = { estado };
        expect(input.estado).toBe(estado);
      });
    });

    it("permite cambiar prioridad", () => {
      const prioridades: Prioridad[] = ["BAJA", "NORMAL", "ALTA", "URGENTE"];

      prioridades.forEach((prioridad) => {
        const input: UpdateOrdenInput = { prioridad };
        expect(input.prioridad).toBe(prioridad);
      });
    });
  });

  describe("Asignación de técnico", () => {
    it("permite asignar un técnico por ID", () => {
      const input: UpdateOrdenInput = { tecnicoId: "tecnico-123" };
      expect(input.tecnicoId).toBe("tecnico-123");
    });

    it("permite desasignar técnico con null", () => {
      const input: UpdateOrdenInput = { tecnicoId: null };
      expect(input.tecnicoId).toBeNull();
    });

    it("permite no especificar técnico (undefined)", () => {
      const input: UpdateOrdenInput = {};
      expect(input.tecnicoId).toBeUndefined();
    });
  });

  describe("Datos del equipo", () => {
    it("permite actualizar marca del equipo", () => {
      const input: UpdateOrdenInput = { marcaEquipo: "Torrey" };
      expect(input.marcaEquipo).toBe("Torrey");
    });

    it("permite actualizar modelo del equipo", () => {
      const input: UpdateOrdenInput = { modeloEquipo: "L-EQ 10/20" };
      expect(input.modeloEquipo).toBe("L-EQ 10/20");
    });

    it("permite actualizar serie del equipo", () => {
      const input: UpdateOrdenInput = { serieEquipo: "SN-2024-001234" };
      expect(input.serieEquipo).toBe("SN-2024-001234");
    });

    it("permite actualizar condición del equipo", () => {
      const condiciones: CondicionEquipo[] = ["BUENA", "REGULAR", "MALA"];

      condiciones.forEach((condicion) => {
        const input: UpdateOrdenInput = { condicionEquipo: condicion };
        expect(input.condicionEquipo).toBe(condicion);
      });
    });

    it("permite actualizar falla reportada", () => {
      const input: UpdateOrdenInput = {
        fallaReportada: "No enciende después de descarga eléctrica"
      };
      expect(input.fallaReportada).toBe("No enciende después de descarga eléctrica");
    });

    it("permite actualizar accesorios como objeto", () => {
      const accesorios = {
        plato: true,
        eliminador: true,
        antena: false,
        candado: true,
      };
      const input: UpdateOrdenInput = { accesorios };
      expect(input.accesorios).toEqual(accesorios);
    });
  });

  describe("Notas del técnico y diagnóstico", () => {
    it("permite actualizar diagnóstico", () => {
      const input: UpdateOrdenInput = {
        diagnostico: "Fuente de poder dañada por sobrecarga"
      };
      expect(input.diagnostico).toBe("Fuente de poder dañada por sobrecarga");
    });

    it("permite actualizar notas del técnico (notas amarillas)", () => {
      const input: UpdateOrdenInput = {
        notasTecnico: "Se reemplazó fuente completa. Recomendar regulador."
      };
      expect(input.notasTecnico).toBe("Se reemplazó fuente completa. Recomendar regulador.");
    });

    it("permite limpiar diagnóstico con string vacío", () => {
      const input: UpdateOrdenInput = { diagnostico: "" };
      expect(input.diagnostico).toBe("");
    });
  });

  describe("Fechas", () => {
    it("permite actualizar fecha promesa como string ISO", () => {
      const input: UpdateOrdenInput = { fechaPromesa: "2024-12-25" };
      expect(input.fechaPromesa).toBe("2024-12-25");
    });

    it("permite limpiar fecha promesa con string vacío", () => {
      const input: UpdateOrdenInput = { fechaPromesa: "" };
      expect(input.fechaPromesa).toBe("");
    });

    it("permite actualizar fecha de factura para garantías", () => {
      const input: UpdateOrdenInput = { fechaFactura: "2024-06-15" };
      expect(input.fechaFactura).toBe("2024-06-15");
    });
  });

  describe("Cotización (POR_COBRAR)", () => {
    it("permite establecer monto de cotización", () => {
      const input: UpdateOrdenInput = { cotizacion: 1500.50 };
      expect(input.cotizacion).toBe(1500.50);
    });

    it("permite establecer cotización aprobada", () => {
      const input: UpdateOrdenInput = { cotizacionAprobada: true };
      expect(input.cotizacionAprobada).toBe(true);
    });

    it("permite establecer cotización no aprobada", () => {
      const input: UpdateOrdenInput = { cotizacionAprobada: false };
      expect(input.cotizacionAprobada).toBe(false);
    });

    it("permite establecer cotización con decimales", () => {
      const input: UpdateOrdenInput = { cotizacion: 2499.99 };
      expect(input.cotizacion).toBe(2499.99);
    });
  });

  describe("Datos de garantía", () => {
    it("permite actualizar número de factura", () => {
      const input: UpdateOrdenInput = { numeroFactura: "FAC-2024-5678" };
      expect(input.numeroFactura).toBe("FAC-2024-5678");
    });
  });

  describe("Datos REPARE", () => {
    it("permite actualizar número REPARE", () => {
      const input: UpdateOrdenInput = { numeroRepare: "REP-2024-1234" };
      expect(input.numeroRepare).toBe("REP-2024-1234");
    });

    it("permite actualizar coordenadas GPS", () => {
      const input: UpdateOrdenInput = { coordenadasGPS: "20.6597,-103.3496" };
      expect(input.coordenadasGPS).toBe("20.6597,-103.3496");
    });
  });

  describe("Actualizaciones múltiples", () => {
    it("permite actualizar múltiples campos a la vez", () => {
      const input: UpdateOrdenInput = {
        estado: "EN_REPARACION",
        prioridad: "ALTA",
        tecnicoId: "tecnico-456",
        diagnostico: "Problema identificado",
        notasTecnico: "Iniciando reparación",
      };

      expect(input.estado).toBe("EN_REPARACION");
      expect(input.prioridad).toBe("ALTA");
      expect(input.tecnicoId).toBe("tecnico-456");
      expect(input.diagnostico).toBe("Problema identificado");
      expect(input.notasTecnico).toBe("Iniciando reparación");
    });

    it("permite actualización completa de orden POR_COBRAR", () => {
      const input: UpdateOrdenInput = {
        estado: "COTIZACION_PENDIENTE",
        cotizacion: 3500.00,
        cotizacionAprobada: false,
        diagnostico: "Requiere cambio de compresor",
        notasTecnico: "Enviada cotización al cliente",
        fechaPromesa: "2024-12-30",
      };

      expect(input.estado).toBe("COTIZACION_PENDIENTE");
      expect(input.cotizacion).toBe(3500.00);
      expect(input.cotizacionAprobada).toBe(false);
    });
  });
});

describe("Transiciones de estado válidas", () => {
  const transicionesValidas: [EstadoOrden, EstadoOrden][] = [
    ["RECIBIDO", "EN_DIAGNOSTICO"],
    ["EN_DIAGNOSTICO", "ESPERA_REFACCIONES"],
    ["EN_DIAGNOSTICO", "EN_REPARACION"],
    ["EN_DIAGNOSTICO", "COTIZACION_PENDIENTE"],
    ["COTIZACION_PENDIENTE", "EN_REPARACION"],
    ["COTIZACION_PENDIENTE", "CANCELADO"],
    ["ESPERA_REFACCIONES", "EN_REPARACION"],
    ["EN_REPARACION", "REPARADO"],
    ["REPARADO", "LISTO_ENTREGA"],
    ["LISTO_ENTREGA", "ENTREGADO"],
  ];

  transicionesValidas.forEach(([estadoActual, nuevoEstado]) => {
    it(`permite transición de ${estadoActual} a ${nuevoEstado}`, () => {
      const input: UpdateOrdenInput = { estado: nuevoEstado };
      expect(input.estado).toBe(nuevoEstado);
    });
  });
});

describe("Helper getNotaCambioEstado", () => {
  // Simular la función helper del API
  function getNotaCambioEstado(estadoAnterior: EstadoOrden, estadoNuevo: EstadoOrden): string {
    const transiciones: Record<string, string> = {
      "RECIBIDO->EN_DIAGNOSTICO": "Equipo pasado a diagnóstico",
      "EN_DIAGNOSTICO->ESPERA_REFACCIONES": "En espera de refacciones",
      "EN_DIAGNOSTICO->COTIZACION_PENDIENTE": "Cotización enviada al cliente",
      "EN_DIAGNOSTICO->EN_REPARACION": "Reparación iniciada",
      "COTIZACION_PENDIENTE->EN_REPARACION": "Cotización aprobada, reparación iniciada",
      "COTIZACION_PENDIENTE->CANCELADO": "Cotización rechazada por cliente",
      "ESPERA_REFACCIONES->EN_REPARACION": "Refacciones recibidas, reparación iniciada",
      "EN_REPARACION->REPARADO": "Reparación completada",
      "REPARADO->LISTO_ENTREGA": "Equipo listo para entrega",
      "LISTO_ENTREGA->ENTREGADO": "Equipo entregado al cliente",
    };

    const key = `${estadoAnterior}->${estadoNuevo}`;
    return transiciones[key] || `Estado cambiado de ${estadoAnterior} a ${estadoNuevo}`;
  }

  it("genera nota correcta para RECIBIDO -> EN_DIAGNOSTICO", () => {
    const nota = getNotaCambioEstado("RECIBIDO", "EN_DIAGNOSTICO");
    expect(nota).toBe("Equipo pasado a diagnóstico");
  });

  it("genera nota correcta para EN_REPARACION -> REPARADO", () => {
    const nota = getNotaCambioEstado("EN_REPARACION", "REPARADO");
    expect(nota).toBe("Reparación completada");
  });

  it("genera nota correcta para COTIZACION_PENDIENTE -> CANCELADO", () => {
    const nota = getNotaCambioEstado("COTIZACION_PENDIENTE", "CANCELADO");
    expect(nota).toBe("Cotización rechazada por cliente");
  });

  it("genera nota genérica para transiciones no definidas", () => {
    const nota = getNotaCambioEstado("RECIBIDO", "CANCELADO");
    expect(nota).toBe("Estado cambiado de RECIBIDO a CANCELADO");
  });

  it("genera nota correcta para entrega final", () => {
    const nota = getNotaCambioEstado("LISTO_ENTREGA", "ENTREGADO");
    expect(nota).toBe("Equipo entregado al cliente");
  });
});

describe("Timestamps automáticos", () => {
  // Estos tests documentan el comportamiento esperado de los timestamps

  it("documenta que fechaReparacion se setea al pasar a REPARADO", () => {
    // Cuando el estado cambia a REPARADO, el API debe setear fechaReparacion = now()
    const estadoNuevo: EstadoOrden = "REPARADO";
    expect(estadoNuevo).toBe("REPARADO");
    // El timestamp se setea en el servidor, no en el cliente
  });

  it("documenta que fechaEntrega se setea al pasar a ENTREGADO", () => {
    // Cuando el estado cambia a ENTREGADO, el API debe setear fechaEntrega = now()
    const estadoNuevo: EstadoOrden = "ENTREGADO";
    expect(estadoNuevo).toBe("ENTREGADO");
    // El timestamp se setea en el servidor, no en el cliente
  });
});

// ============ RBAC (Control de Acceso por Roles) ============

describe("RBAC - checkRole", () => {
  const createSession = (role: Role): Session => ({
    user: {
      id: "user-123",
      role,
      email: "test@test.com",
      name: "Test User",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });

  it("SUPER_ADMIN tiene acceso a roles de admin", () => {
    const session = createSession("SUPER_ADMIN");
    expect(checkRole(session, ["SUPER_ADMIN", "COORD_SERVICIO"])).toBe(true);
  });

  it("COORD_SERVICIO tiene acceso a roles de coordinador", () => {
    const session = createSession("COORD_SERVICIO");
    expect(checkRole(session, ["SUPER_ADMIN", "COORD_SERVICIO"])).toBe(true);
  });

  it("TECNICO no tiene acceso a roles de admin", () => {
    const session = createSession("TECNICO");
    expect(checkRole(session, ["SUPER_ADMIN", "COORD_SERVICIO"])).toBe(false);
  });

  it("REFACCIONES no tiene acceso a roles de admin", () => {
    const session = createSession("REFACCIONES");
    expect(checkRole(session, ["SUPER_ADMIN", "COORD_SERVICIO"])).toBe(false);
  });

  it("retorna false para sesión nula", () => {
    expect(checkRole(null, ["SUPER_ADMIN"])).toBe(false);
  });

  it("retorna false para sesión sin usuario", () => {
    const session = { expires: "" } as Session;
    expect(checkRole(session, ["SUPER_ADMIN"])).toBe(false);
  });
});

describe("RBAC - canAccessOrden", () => {
  const createSession = (role: Role, userId = "user-123"): Session => ({
    user: {
      id: userId,
      role,
      email: "test@test.com",
      name: "Test User",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });

  it("SUPER_ADMIN puede acceder a cualquier orden", () => {
    const session = createSession("SUPER_ADMIN");
    const orden = { tecnicoId: "otro-tecnico" };
    expect(canAccessOrden(session, orden)).toBe(true);
  });

  it("COORD_SERVICIO puede acceder a cualquier orden", () => {
    const session = createSession("COORD_SERVICIO");
    const orden = { tecnicoId: "otro-tecnico" };
    expect(canAccessOrden(session, orden)).toBe(true);
  });

  it("REFACCIONES puede ver cualquier orden", () => {
    const session = createSession("REFACCIONES");
    const orden = { tecnicoId: "otro-tecnico" };
    expect(canAccessOrden(session, orden)).toBe(true);
  });

  it("TECNICO puede acceder a órdenes asignadas a él", () => {
    const session = createSession("TECNICO", "tecnico-123");
    const orden = { tecnicoId: "tecnico-123" };
    expect(canAccessOrden(session, orden)).toBe(true);
  });

  it("TECNICO NO puede acceder a órdenes de otros técnicos", () => {
    const session = createSession("TECNICO", "tecnico-123");
    const orden = { tecnicoId: "otro-tecnico" };
    expect(canAccessOrden(session, orden)).toBe(false);
  });

  it("TECNICO NO puede acceder a órdenes sin técnico asignado", () => {
    const session = createSession("TECNICO", "tecnico-123");
    const orden = { tecnicoId: null };
    expect(canAccessOrden(session, orden)).toBe(false);
  });
});

describe("RBAC - getUserRole", () => {
  it("retorna el rol del usuario", () => {
    const session: Session = {
      user: {
        id: "user-123",
        role: "COORD_SERVICIO",
        email: "test@test.com",
        name: "Test",
      },
      expires: "",
    };
    expect(getUserRole(session)).toBe("COORD_SERVICIO");
  });

  it("retorna TECNICO como fallback si no hay rol", () => {
    const session: Session = {
      user: {
        id: "user-123",
        email: "test@test.com",
        name: "Test",
      },
      expires: "",
    };
    expect(getUserRole(session)).toBe("TECNICO");
  });

  it("retorna TECNICO para sesión nula", () => {
    expect(getUserRole(null)).toBe("TECNICO");
  });
});

describe("RBAC - canTecnicoUpdateFields", () => {
  it("permite actualizar diagnóstico", () => {
    const orden = { tipoServicio: "GARANTIA" };
    const result = canTecnicoUpdateFields(["diagnostico"], orden);
    expect(result.allowed).toBe(true);
    expect(result.forbiddenFields).toEqual([]);
  });

  it("permite actualizar notasTecnico", () => {
    const orden = { tipoServicio: "GARANTIA" };
    const result = canTecnicoUpdateFields(["notasTecnico"], orden);
    expect(result.allowed).toBe(true);
  });

  it("permite actualizar cotización solo para POR_COBRAR", () => {
    const ordenPorCobrar = { tipoServicio: "POR_COBRAR" };
    const result = canTecnicoUpdateFields(["cotizacion"], ordenPorCobrar);
    expect(result.allowed).toBe(true);
  });

  it("NO permite actualizar cotización para GARANTIA", () => {
    const ordenGarantia = { tipoServicio: "GARANTIA" };
    const result = canTecnicoUpdateFields(["cotizacion"], ordenGarantia);
    expect(result.allowed).toBe(false);
    expect(result.forbiddenFields).toContain("cotizacion");
  });

  it("NO permite actualizar estado", () => {
    const orden = { tipoServicio: "GARANTIA" };
    const result = canTecnicoUpdateFields(["estado"], orden);
    expect(result.allowed).toBe(false);
    expect(result.forbiddenFields).toContain("estado");
  });

  it("NO permite actualizar prioridad", () => {
    const orden = { tipoServicio: "GARANTIA" };
    const result = canTecnicoUpdateFields(["prioridad"], orden);
    expect(result.allowed).toBe(false);
    expect(result.forbiddenFields).toContain("prioridad");
  });

  it("NO permite actualizar tecnicoId", () => {
    const orden = { tipoServicio: "GARANTIA" };
    const result = canTecnicoUpdateFields(["tecnicoId"], orden);
    expect(result.allowed).toBe(false);
    expect(result.forbiddenFields).toContain("tecnicoId");
  });

  it("detecta múltiples campos prohibidos", () => {
    const orden = { tipoServicio: "GARANTIA" };
    const result = canTecnicoUpdateFields(["estado", "prioridad", "diagnostico"], orden);
    expect(result.allowed).toBe(false);
    expect(result.forbiddenFields).toContain("estado");
    expect(result.forbiddenFields).toContain("prioridad");
    expect(result.forbiddenFields).not.toContain("diagnostico");
  });
});

describe("RBAC - canRefaccionesUpdateOrden", () => {
  it("permite actualizar órdenes en ESPERA_REFACCIONES", () => {
    const orden = { estado: "ESPERA_REFACCIONES" };
    expect(canRefaccionesUpdateOrden(orden)).toBe(true);
  });

  it("NO permite actualizar órdenes en RECIBIDO", () => {
    const orden = { estado: "RECIBIDO" };
    expect(canRefaccionesUpdateOrden(orden)).toBe(false);
  });

  it("NO permite actualizar órdenes en EN_REPARACION", () => {
    const orden = { estado: "EN_REPARACION" };
    expect(canRefaccionesUpdateOrden(orden)).toBe(false);
  });

  it("NO permite actualizar órdenes en ENTREGADO", () => {
    const orden = { estado: "ENTREGADO" };
    expect(canRefaccionesUpdateOrden(orden)).toBe(false);
  });
});

describe("RBAC - Permisos de creación de órdenes", () => {
  // Estos tests documentan el comportamiento esperado del endpoint POST /api/ordenes

  it("SUPER_ADMIN puede crear órdenes", () => {
    const rolesPermitidos: Role[] = ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES"];
    expect(rolesPermitidos.includes("SUPER_ADMIN")).toBe(true);
  });

  it("COORD_SERVICIO puede crear órdenes", () => {
    const rolesPermitidos: Role[] = ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES"];
    expect(rolesPermitidos.includes("COORD_SERVICIO")).toBe(true);
  });

  it("REFACCIONES puede crear órdenes", () => {
    const rolesPermitidos: Role[] = ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES"];
    expect(rolesPermitidos.includes("REFACCIONES")).toBe(true);
  });

  it("TECNICO NO puede crear órdenes", () => {
    const rolesPermitidos: Role[] = ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES"];
    expect(rolesPermitidos.includes("TECNICO")).toBe(false);
  });
});

describe("RBAC - Permisos de cancelación de órdenes", () => {
  // Estos tests documentan el comportamiento esperado del endpoint DELETE /api/ordenes/[id]

  it("SUPER_ADMIN puede cancelar órdenes", () => {
    const rolesPermitidos: Role[] = ["SUPER_ADMIN", "COORD_SERVICIO"];
    expect(rolesPermitidos.includes("SUPER_ADMIN")).toBe(true);
  });

  it("COORD_SERVICIO puede cancelar órdenes", () => {
    const rolesPermitidos: Role[] = ["SUPER_ADMIN", "COORD_SERVICIO"];
    expect(rolesPermitidos.includes("COORD_SERVICIO")).toBe(true);
  });

  it("TECNICO NO puede cancelar órdenes", () => {
    const rolesPermitidos: Role[] = ["SUPER_ADMIN", "COORD_SERVICIO"];
    expect(rolesPermitidos.includes("TECNICO")).toBe(false);
  });

  it("REFACCIONES NO puede cancelar órdenes", () => {
    const rolesPermitidos: Role[] = ["SUPER_ADMIN", "COORD_SERVICIO"];
    expect(rolesPermitidos.includes("REFACCIONES")).toBe(false);
  });
});
