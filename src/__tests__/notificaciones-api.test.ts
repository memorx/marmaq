import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { TipoNotificacion, PrioridadNotif } from "@prisma/client";

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    notificacion: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock notification service
vi.mock("@/lib/notificaciones/notification-service", () => ({
  obtenerNotificaciones: vi.fn(),
  contarNoLeidas: vi.fn(),
  marcarLeida: vi.fn(),
  marcarTodasLeidas: vi.fn(),
}));

import { GET } from "@/app/api/notificaciones/route";
import { PATCH } from "@/app/api/notificaciones/[id]/route";
import { POST } from "@/app/api/notificaciones/marcar-todas/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import {
  obtenerNotificaciones,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
} from "@/lib/notificaciones/notification-service";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  notificacion: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};
const mockObtenerNotificaciones = obtenerNotificaciones as ReturnType<typeof vi.fn>;
const mockContarNoLeidas = contarNoLeidas as ReturnType<typeof vi.fn>;
const mockMarcarLeida = marcarLeida as ReturnType<typeof vi.fn>;
const mockMarcarTodasLeidas = marcarTodasLeidas as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), options);
}

describe("API /api/notificaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/notificaciones", () => {
    it("devuelve 401 sin sesión", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createRequest("http://localhost/api/notificaciones");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("No autorizado");
    });

    it("devuelve 401 si no hay user.id en la sesión", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Test" } });

      const request = createRequest("http://localhost/api/notificaciones");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("devuelve notificaciones del usuario autenticado", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", name: "Test" } });

      const mockNotifs = [
        {
          id: "notif-1",
          tipo: TipoNotificacion.ALERTA_ROJO,
          titulo: "Alerta",
          mensaje: "Mensaje",
          prioridad: PrioridadNotif.ALTA,
          leida: false,
          fechaLeida: null,
          ordenId: "orden-1",
          orden: { id: "orden-1", folio: "OS-2025-0001" },
          createdAt: new Date(),
        },
      ];

      mockObtenerNotificaciones.mockResolvedValue({
        notificaciones: mockNotifs,
        nextCursor: null,
      });
      mockContarNoLeidas.mockResolvedValue(3);

      const request = createRequest("http://localhost/api/notificaciones");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.notificaciones).toHaveLength(1);
      expect(data.noLeidas).toBe(3);
      expect(data.nextCursor).toBeNull();
    });

    it("filtra por soloNoLeidas", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockObtenerNotificaciones.mockResolvedValue({
        notificaciones: [],
        nextCursor: null,
      });
      mockContarNoLeidas.mockResolvedValue(0);

      const request = createRequest(
        "http://localhost/api/notificaciones?soloNoLeidas=true"
      );
      await GET(request);

      expect(mockObtenerNotificaciones).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ soloNoLeidas: true })
      );
    });

    it("respeta limit", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockObtenerNotificaciones.mockResolvedValue({
        notificaciones: [],
        nextCursor: null,
      });
      mockContarNoLeidas.mockResolvedValue(0);

      const request = createRequest(
        "http://localhost/api/notificaciones?limit=10"
      );
      await GET(request);

      expect(mockObtenerNotificaciones).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ limit: 10 })
      );
    });

    it("incluye conteo de noLeidas", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockObtenerNotificaciones.mockResolvedValue({
        notificaciones: [],
        nextCursor: null,
      });
      mockContarNoLeidas.mockResolvedValue(5);

      const request = createRequest("http://localhost/api/notificaciones");
      const response = await GET(request);

      const data = await response.json();
      expect(data.noLeidas).toBe(5);
    });
  });

  describe("PATCH /api/notificaciones/[id]", () => {
    it("devuelve 401 sin sesión", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createRequest("http://localhost/api/notificaciones/notif-1", {
        method: "PATCH",
        body: JSON.stringify({ leida: true }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "notif-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("marca notificación como leída", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.notificacion.findUnique.mockResolvedValue({
        id: "notif-1",
        usuarioId: "user-1",
      });
      mockMarcarLeida.mockResolvedValue(true);

      const request = createRequest("http://localhost/api/notificaciones/notif-1", {
        method: "PATCH",
        body: JSON.stringify({ leida: true }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "notif-1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockMarcarLeida).toHaveBeenCalledWith("notif-1", "user-1");
    });

    it("devuelve 404 si la notificación no existe", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.notificacion.findUnique.mockResolvedValue(null);

      const request = createRequest("http://localhost/api/notificaciones/notif-xxx", {
        method: "PATCH",
        body: JSON.stringify({ leida: true }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "notif-xxx" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Notificación no encontrada");
    });

    it("devuelve 403 si la notificación es de otro usuario", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.notificacion.findUnique.mockResolvedValue({
        id: "notif-1",
        usuarioId: "user-2", // Different user
      });

      const request = createRequest("http://localhost/api/notificaciones/notif-1", {
        method: "PATCH",
        body: JSON.stringify({ leida: true }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "notif-1" }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("No tienes permiso");
    });
  });

  describe("POST /api/notificaciones/marcar-todas", () => {
    it("devuelve 401 sin sesión", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await POST();

      expect(response.status).toBe(401);
    });

    it("marca todas como leídas", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockMarcarTodasLeidas.mockResolvedValue(5);

      const response = await POST();

      expect(response.status).toBe(200);
      expect(mockMarcarTodasLeidas).toHaveBeenCalledWith("user-1");
    });

    it("devuelve conteo de actualizadas", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockMarcarTodasLeidas.mockResolvedValue(7);

      const response = await POST();

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.actualizadas).toBe(7);
    });
  });
});
