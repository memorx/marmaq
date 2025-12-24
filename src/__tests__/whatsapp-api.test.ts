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
      findUnique: vi.fn(),
    },
    notificacionWhatsApp: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    plantillaMensaje: {
      findUnique: vi.fn(),
    },
    configuracion: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/notificaciones/whatsapp/route";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  orden: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  notificacionWhatsApp: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  plantillaMensaje: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  configuracion: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

// Helper para crear request
function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

describe("GET /api/notificaciones/whatsapp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.notificacionWhatsApp.findMany.mockResolvedValue([]);
  });

  it("debe rechazar solicitudes sin autenticación", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("/api/notificaciones/whatsapp");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("No autorizado");
  });

  it("debe retornar lista de notificaciones", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const mockNotificaciones = [
      {
        id: "notif-1",
        ordenId: "orden-1",
        clienteId: "cliente-1",
        telefono: "+521234567890",
        tipo: "RECIBIDO",
        mensaje: "Test message",
        estado: "PENDIENTE",
        fechaCreacion: new Date(),
        orden: { id: "orden-1", folio: "OS-2024-0001" },
        cliente: { id: "cliente-1", nombre: "Juan", empresa: "Test Inc" },
      },
    ];

    mockPrisma.notificacionWhatsApp.findMany.mockResolvedValue(mockNotificaciones);

    const request = createRequest("/api/notificaciones/whatsapp");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("notif-1");
  });

  it("debe filtrar por ordenId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.notificacionWhatsApp.findMany.mockResolvedValue([]);

    const request = createRequest("/api/notificaciones/whatsapp?ordenId=orden-123");
    await GET(request);

    expect(mockPrisma.notificacionWhatsApp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ordenId: "orden-123" }),
      })
    );
  });

  it("debe filtrar por estado", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.notificacionWhatsApp.findMany.mockResolvedValue([]);

    const request = createRequest("/api/notificaciones/whatsapp?estado=ENVIADO");
    await GET(request);

    expect(mockPrisma.notificacionWhatsApp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: "ENVIADO" }),
      })
    );
  });
});

describe("POST /api/notificaciones/whatsapp", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      marcaEquipo: "TORREY",
      modeloEquipo: "EQB-100",
      cotizacion: null,
      fechaPromesa: null,
      cliente: {
        id: "cliente-1",
        nombre: "Juan Pérez",
        empresa: "Test Inc",
        telefono: "5512345678",
      },
      tecnico: { name: "Carlos Técnico" },
    });

    mockPrisma.plantillaMensaje.findUnique.mockResolvedValue(null);
    mockPrisma.configuracion.findUnique.mockResolvedValue(null);

    mockPrisma.notificacionWhatsApp.create.mockResolvedValue({
      id: "notif-1",
      tipo: "RECIBIDO",
      estado: "PENDIENTE",
      mensaje: "Test message",
      telefono: "+525512345678",
    });
  });

  it("debe rechazar solicitudes sin autenticación", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("/api/notificaciones/whatsapp", {
      method: "POST",
      body: JSON.stringify({ ordenId: "orden-1", tipo: "RECIBIDO" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("debe rechazar si falta ordenId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const request = createRequest("/api/notificaciones/whatsapp", {
      method: "POST",
      body: JSON.stringify({ tipo: "RECIBIDO" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("ordenId es requerido");
  });

  it("debe rechazar si falta tipo", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const request = createRequest("/api/notificaciones/whatsapp", {
      method: "POST",
      body: JSON.stringify({ ordenId: "orden-1" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("tipo de notificación es requerido");
  });

  it("debe retornar 404 si orden no existe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue(null);

    const request = createRequest("/api/notificaciones/whatsapp", {
      method: "POST",
      body: JSON.stringify({ ordenId: "orden-invalid", tipo: "RECIBIDO" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Orden no encontrada");
  });

  it("debe rechazar si cliente no tiene teléfono válido", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });
    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      marcaEquipo: "TORREY",
      modeloEquipo: "EQB-100",
      cliente: {
        id: "cliente-1",
        nombre: "Juan",
        telefono: "123", // Teléfono inválido
      },
      tecnico: null,
    });

    const request = createRequest("/api/notificaciones/whatsapp", {
      method: "POST",
      body: JSON.stringify({ ordenId: "orden-1", tipo: "RECIBIDO" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("El cliente no tiene un número de teléfono válido");
  });

  it("debe crear notificación exitosamente", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const request = createRequest("/api/notificaciones/whatsapp", {
      method: "POST",
      body: JSON.stringify({ ordenId: "orden-1", tipo: "RECIBIDO" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.notificacion).toBeDefined();
    expect(data.linkWhatsApp).toBeDefined();
    expect(data.linkWhatsApp).toContain("wa.me");
  });

  it("debe usar plantilla de BD si existe", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    mockPrisma.plantillaMensaje.findUnique.mockResolvedValue({
      tipo: "RECIBIDO",
      mensaje: "Mensaje personalizado para {nombre}",
      activa: true,
    });

    const request = createRequest("/api/notificaciones/whatsapp", {
      method: "POST",
      body: JSON.stringify({ ordenId: "orden-1", tipo: "RECIBIDO" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockPrisma.notificacionWhatsApp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mensaje: expect.stringContaining("Mensaje personalizado para Juan Pérez"),
        }),
      })
    );
  });

  it("debe usar mensaje personalizado si se proporciona", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const request = createRequest("/api/notificaciones/whatsapp", {
      method: "POST",
      body: JSON.stringify({
        ordenId: "orden-1",
        tipo: "PERSONALIZADO",
        mensajePersonalizado: "Mensaje directo para {nombre}",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockPrisma.notificacionWhatsApp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mensaje: "Mensaje directo para Juan Pérez",
        }),
      })
    );
  });

  it("debe formatear teléfono correctamente", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    const request = createRequest("/api/notificaciones/whatsapp", {
      method: "POST",
      body: JSON.stringify({ ordenId: "orden-1", tipo: "RECIBIDO" }),
    });
    await POST(request);

    expect(mockPrisma.notificacionWhatsApp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          telefono: "+525512345678",
        }),
      })
    );
  });
});

describe("Template utilities", () => {
  // Test the template processing function
  it("debe procesar variables en plantillas", async () => {
    const { procesarPlantilla } = await import("@/lib/whatsapp/templates");

    const plantilla = "Hola {nombre}, su equipo {marca} {modelo} con folio {folio}";
    const variables = {
      nombre: "Juan",
      marca: "TORREY",
      modelo: "EQB-100",
      folio: "OS-2024-0001",
    };

    const resultado = procesarPlantilla(plantilla, variables);
    expect(resultado).toBe("Hola Juan, su equipo TORREY EQB-100 con folio OS-2024-0001");
  });

  it("debe formatear teléfono con código de país", async () => {
    const { formatearTelefono } = await import("@/lib/whatsapp/templates");

    expect(formatearTelefono("5512345678")).toBe("+525512345678");
    expect(formatearTelefono("+525512345678")).toBe("+525512345678");
    expect(formatearTelefono("525512345678")).toBe("+525512345678");
    expect(formatearTelefono("55 1234 5678")).toBe("+525512345678");
  });

  it("debe generar link de WhatsApp correctamente", async () => {
    const { generarLinkWhatsApp } = await import("@/lib/whatsapp/templates");

    const link = generarLinkWhatsApp("5512345678", "Hola mundo");
    expect(link).toBe("https://wa.me/525512345678?text=Hola%20mundo");
  });

  it("debe validar teléfonos correctamente", async () => {
    const { validarTelefono } = await import("@/lib/whatsapp/templates");

    expect(validarTelefono("5512345678")).toBe(true);
    expect(validarTelefono("+525512345678")).toBe(true);
    expect(validarTelefono("123")).toBe(false);
    expect(validarTelefono("abcdefghij")).toBe(false);
  });
});

describe("Tipos de notificación", () => {
  const tipos = [
    "RECIBIDO",
    "EN_REPARACION",
    "COTIZACION",
    "LISTO_ENTREGA",
    "ENTREGADO",
    "RECORDATORIO",
    "PERSONALIZADO",
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", role: "TECNICO" },
    });

    mockPrisma.orden.findUnique.mockResolvedValue({
      id: "orden-1",
      folio: "OS-2024-0001",
      marcaEquipo: "TORREY",
      modeloEquipo: "EQB-100",
      cotizacion: 1500,
      fechaPromesa: new Date(),
      cliente: {
        id: "cliente-1",
        nombre: "Juan",
        empresa: "Test",
        telefono: "5512345678",
      },
      tecnico: { name: "Carlos" },
    });

    mockPrisma.plantillaMensaje.findUnique.mockResolvedValue(null);
    mockPrisma.configuracion.findUnique.mockResolvedValue(null);
    mockPrisma.notificacionWhatsApp.create.mockResolvedValue({
      id: "notif-1",
      tipo: "RECIBIDO",
      estado: "PENDIENTE",
      mensaje: "Test",
      telefono: "+525512345678",
    });
  });

  for (const tipo of tipos) {
    it(`debe aceptar tipo ${tipo}`, async () => {
      const request = createRequest("/api/notificaciones/whatsapp", {
        method: "POST",
        body: JSON.stringify({
          ordenId: "orden-1",
          tipo,
          mensajePersonalizado: tipo === "PERSONALIZADO" ? "Mensaje custom" : undefined,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  }
});
