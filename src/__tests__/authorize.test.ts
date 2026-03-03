import { describe, it, expect } from "vitest";
import { checkRole, canAccessOrden, canViewOrden, getUserRole } from "@/lib/auth/authorize";
import type { Session } from "next-auth";

// Helper para crear sesión mock
function createSession(role: string, userId: string = "user-1"): Session {
  return {
    user: { id: userId, email: "test@test.com", name: "Test", role },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

describe("authorize — VENDEDOR role", () => {
  describe("canAccessOrden", () => {
    it("VENDEDOR puede acceder a orden que él creó", () => {
      const session = createSession("VENDEDOR", "vendedor-1");
      const orden = { tecnicoId: "tecnico-1", creadoPorId: "vendedor-1" };
      expect(canAccessOrden(session, orden)).toBe(true);
    });

    it("VENDEDOR NO puede acceder a orden creada por otro", () => {
      const session = createSession("VENDEDOR", "vendedor-1");
      const orden = { tecnicoId: "tecnico-1", creadoPorId: "vendedor-2" };
      expect(canAccessOrden(session, orden)).toBe(false);
    });

    it("VENDEDOR NO puede acceder a orden sin creadoPorId", () => {
      const session = createSession("VENDEDOR", "vendedor-1");
      const orden = { tecnicoId: null, creadoPorId: null };
      expect(canAccessOrden(session, orden)).toBe(false);
    });

    // Verificar que los otros roles NO se rompieron
    it("SUPER_ADMIN sigue con acceso total", () => {
      const session = createSession("SUPER_ADMIN");
      const orden = { tecnicoId: null, creadoPorId: "alguien" };
      expect(canAccessOrden(session, orden)).toBe(true);
    });

    it("COORD_SERVICIO sigue con acceso total", () => {
      const session = createSession("COORD_SERVICIO");
      const orden = { tecnicoId: null, creadoPorId: "alguien" };
      expect(canAccessOrden(session, orden)).toBe(true);
    });

    it("TECNICO solo accede a sus órdenes asignadas", () => {
      const session = createSession("TECNICO", "tec-1");
      expect(canAccessOrden(session, { tecnicoId: "tec-1", creadoPorId: "otro" })).toBe(true);
      expect(canAccessOrden(session, { tecnicoId: "tec-2", creadoPorId: "otro" })).toBe(false);
    });
  });

  describe("checkRole", () => {
    it("VENDEDOR es reconocido como rol válido", () => {
      const session = createSession("VENDEDOR");
      expect(checkRole(session, ["VENDEDOR"])).toBe(true);
    });

    it("VENDEDOR NO tiene permisos de COORD_SERVICIO", () => {
      const session = createSession("VENDEDOR");
      expect(checkRole(session, ["SUPER_ADMIN", "COORD_SERVICIO"])).toBe(false);
    });
  });

  describe("getUserRole", () => {
    it("retorna VENDEDOR correctamente", () => {
      const session = createSession("VENDEDOR");
      expect(getUserRole(session)).toBe("VENDEDOR");
    });

    it("fallback a TECNICO si no hay role", () => {
      expect(getUserRole(null)).toBe("TECNICO");
    });
  });
});

describe("authorize — canViewOrden (lectura)", () => {
  it("canViewOrden retorna true para TECNICO con orden sin técnico asignado", () => {
    const session = createSession("TECNICO", "tec-1");
    const orden = { tecnicoId: null, creadoPorId: "admin-1" };
    expect(canViewOrden(session, orden)).toBe(true);
  });

  it("canViewOrden retorna true para TECNICO con orden asignada a otro técnico", () => {
    const session = createSession("TECNICO", "tec-1");
    const orden = { tecnicoId: "tec-2", creadoPorId: "admin-1" };
    expect(canViewOrden(session, orden)).toBe(true);
  });

  it("canViewOrden retorna true para TECNICO con orden asignada a él", () => {
    const session = createSession("TECNICO", "tec-1");
    const orden = { tecnicoId: "tec-1", creadoPorId: "admin-1" };
    expect(canViewOrden(session, orden)).toBe(true);
  });

  it("canAccessOrden (edit) retorna false para TECNICO con orden de otro técnico", () => {
    const session = createSession("TECNICO", "tec-1");
    const orden = { tecnicoId: "tec-2", creadoPorId: "admin-1" };
    expect(canAccessOrden(session, orden)).toBe(false);
  });

  it("canAccessOrden (edit) retorna true para TECNICO con su propia orden", () => {
    const session = createSession("TECNICO", "tec-1");
    const orden = { tecnicoId: "tec-1", creadoPorId: "admin-1" };
    expect(canAccessOrden(session, orden)).toBe(true);
  });

  it("canViewOrden retorna false para VENDEDOR con orden que no creó", () => {
    const session = createSession("VENDEDOR", "vendedor-1");
    const orden = { tecnicoId: "tec-1", creadoPorId: "vendedor-2" };
    expect(canViewOrden(session, orden)).toBe(false);
  });

  it("canViewOrden retorna true para VENDEDOR con orden que sí creó", () => {
    const session = createSession("VENDEDOR", "vendedor-1");
    const orden = { tecnicoId: "tec-1", creadoPorId: "vendedor-1" };
    expect(canViewOrden(session, orden)).toBe(true);
  });

  it("canViewOrden retorna true para SUPER_ADMIN", () => {
    const session = createSession("SUPER_ADMIN");
    const orden = { tecnicoId: "tec-1", creadoPorId: "otro" };
    expect(canViewOrden(session, orden)).toBe(true);
  });

  it("canViewOrden retorna true para COORD_SERVICIO", () => {
    const session = createSession("COORD_SERVICIO");
    const orden = { tecnicoId: "tec-1", creadoPorId: "otro" };
    expect(canViewOrden(session, orden)).toBe(true);
  });

  it("canViewOrden retorna true para REFACCIONES", () => {
    const session = createSession("REFACCIONES");
    const orden = { tecnicoId: "tec-1", creadoPorId: "otro" };
    expect(canViewOrden(session, orden)).toBe(true);
  });

  it("canViewOrden retorna false para sesión null", () => {
    expect(canViewOrden(null, { tecnicoId: "tec-1" })).toBe(false);
  });
});
