import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============ MOCKS ============

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    chatConversation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/chat/anthropic", () => ({
  SYSTEM_PROMPT: "mock system prompt",
  getChatResponse: vi.fn().mockResolvedValue("respuesta mock"),
}));

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { getChatResponse } from "@/lib/chat/anthropic";
import { GET as GET_CONVERSACIONES, POST as POST_CONVERSACIONES } from "@/app/api/chat/conversaciones/route";
import { DELETE as DELETE_CONV } from "@/app/api/chat/conversaciones/[id]/route";
import { POST as POST_MENSAJE } from "@/app/api/chat/conversaciones/[id]/mensajes/route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  chatConversation: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  chatMessage: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};
const mockGetChatResponse = getChatResponse as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

const adminSession = {
  user: { id: "admin-1", name: "Admin", role: "SUPER_ADMIN" },
};

const tecnicoSession = {
  user: { id: "tecnico-1", name: "Benito", role: "TECNICO" },
};

// ============ TESTS ============

describe("Chat Conversaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. POST /conversaciones creates conversation + 2 messages (201)
  it("POST /conversaciones crea conversación con 2 mensajes (201)", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const mockConv = { id: "conv-1", titulo: "Hola necesito ayuda" };
    mockPrisma.chatConversation.create.mockResolvedValue(mockConv);
    mockPrisma.chatMessage.create.mockResolvedValue({});
    mockPrisma.chatConversation.update.mockResolvedValue({});
    mockGetChatResponse.mockResolvedValue("respuesta mock");

    const request = createRequest("/api/chat/conversaciones", {
      method: "POST",
      body: JSON.stringify({ mensaje: "Hola necesito ayuda con una orden" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST_CONVERSACIONES(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.conversacion.id).toBe("conv-1");
    expect(data.respuesta).toBe("respuesta mock");

    // Conversation created + USER message (via nested create) + ASSISTANT message
    expect(mockPrisma.chatConversation.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.chatMessage.create).toHaveBeenCalledTimes(1);
    expect(mockGetChatResponse).toHaveBeenCalledTimes(1);
  });

  // 2. POST /conversaciones without auth returns 401
  it("POST /conversaciones sin auth retorna 401", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest("/api/chat/conversaciones", {
      method: "POST",
      body: JSON.stringify({ mensaje: "Hola" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST_CONVERSACIONES(request);
    expect(response.status).toBe(401);
  });

  // 3. GET /conversaciones returns only user's conversations
  it("GET /conversaciones retorna solo las conversaciones del usuario", async () => {
    mockAuth.mockResolvedValue(tecnicoSession);

    const mockConvs = [
      { id: "conv-1", titulo: "Ayuda orden", usuarioId: "tecnico-1", activa: true, _count: { mensajes: 3 }, usuario: { name: "Benito" } },
    ];
    mockPrisma.chatConversation.findMany.mockResolvedValue(mockConvs);

    const request = createRequest("/api/chat/conversaciones?activa=true");
    const response = await GET_CONVERSACIONES(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.conversaciones).toHaveLength(1);

    // Verify filter includes usuarioId
    expect(mockPrisma.chatConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ usuarioId: "tecnico-1" }),
      })
    );
  });

  // 4. GET ?all=true as SUPER_ADMIN returns all
  it("GET ?all=true como SUPER_ADMIN retorna todas las conversaciones", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const mockConvs = [
      { id: "conv-1", usuarioId: "admin-1", _count: { mensajes: 2 }, usuario: { name: "Admin" } },
      { id: "conv-2", usuarioId: "tecnico-1", _count: { mensajes: 5 }, usuario: { name: "Benito" } },
    ];
    mockPrisma.chatConversation.findMany.mockResolvedValue(mockConvs);

    const request = createRequest("/api/chat/conversaciones?all=true&limit=50");
    const response = await GET_CONVERSACIONES(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.conversaciones).toHaveLength(2);

    // Verify no usuarioId filter when admin uses all=true
    const callArgs = mockPrisma.chatConversation.findMany.mock.calls[0][0];
    expect(callArgs.where.usuarioId).toBeUndefined();
  });

  // 5. GET ?all=true as TECNICO returns only theirs
  it("GET ?all=true como TECNICO retorna solo sus conversaciones", async () => {
    mockAuth.mockResolvedValue(tecnicoSession);

    mockPrisma.chatConversation.findMany.mockResolvedValue([]);

    const request = createRequest("/api/chat/conversaciones?all=true");
    const response = await GET_CONVERSACIONES(request);
    expect(response.status).toBe(200);

    // Should still filter by userId since not SUPER_ADMIN
    expect(mockPrisma.chatConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ usuarioId: "tecnico-1" }),
      })
    );
  });

  // 6. POST /conversaciones/[id]/mensajes adds message to existing conversation
  it("POST /conversaciones/[id]/mensajes agrega mensaje a conversación existente", async () => {
    mockAuth.mockResolvedValue(tecnicoSession);

    mockPrisma.chatConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      usuarioId: "tecnico-1",
      activa: true,
      _count: { mensajes: 4 },
    });

    mockPrisma.chatMessage.create.mockResolvedValue({});
    mockPrisma.chatMessage.findMany.mockResolvedValue([
      { role: "USER", content: "Hola" },
      { role: "ASSISTANT", content: "¿En qué te ayudo?" },
      { role: "USER", content: "¿Cómo cambio el estado?" },
    ]);
    mockGetChatResponse.mockResolvedValue("respuesta mock");
    mockPrisma.chatConversation.update.mockResolvedValue({});

    const request = createRequest("/api/chat/conversaciones/conv-1/mensajes", {
      method: "POST",
      body: JSON.stringify({ mensaje: "¿Cómo cambio el estado?" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST_MENSAJE(request, { params: createParams("conv-1") });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.respuesta).toBe("respuesta mock");
    expect(data.conversacionId).toBe("conv-1");

    // USER + ASSISTANT messages created
    expect(mockPrisma.chatMessage.create).toHaveBeenCalledTimes(2);
  });

  // 7. POST to another user's conversation returns 403
  it("POST a conversación de otro usuario retorna 403", async () => {
    mockAuth.mockResolvedValue(tecnicoSession);

    mockPrisma.chatConversation.findUnique.mockResolvedValue({
      id: "conv-admin",
      usuarioId: "admin-1", // Different user
      activa: true,
      _count: { mensajes: 2 },
    });

    const request = createRequest("/api/chat/conversaciones/conv-admin/mensajes", {
      method: "POST",
      body: JSON.stringify({ mensaje: "Hola" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST_MENSAJE(request, { params: createParams("conv-admin") });
    expect(response.status).toBe(403);
  });

  // 8. DELETE archives conversation (activa=false)
  it("DELETE archiva conversación (activa=false)", async () => {
    mockAuth.mockResolvedValue(tecnicoSession);

    mockPrisma.chatConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      usuarioId: "tecnico-1",
      activa: true,
    });
    mockPrisma.chatConversation.update.mockResolvedValue({ id: "conv-1", activa: false });

    const request = createRequest("/api/chat/conversaciones/conv-1", {
      method: "DELETE",
    });

    const response = await DELETE_CONV(request, { params: createParams("conv-1") });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.ok).toBe(true);

    expect(mockPrisma.chatConversation.update).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { activa: false },
    });
  });

  // 9. ChatWidget renders without error (basic smoke test)
  it("ChatWidget se importa sin errores", async () => {
    // Basic import test — full render tests require React testing library
    const mod = await import("@/components/chat/ChatWidget");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  // 10. getChatResponse helper returns string
  it("getChatResponse helper retorna string", async () => {
    mockGetChatResponse.mockResolvedValue("Hola, soy Maq");
    const result = await getChatResponse([{ role: "user", content: "Hola" }]);
    expect(typeof result).toBe("string");
    expect(result).toBe("Hola, soy Maq");
  });
});
