import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, mockCreate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCreate: vi.fn(),
}));

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: mockAuth,
}));

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { POST } from "@/app/api/chat/route";

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 401 si no hay sesión", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest({ messages: [{ role: "user", content: "Hola" }] });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 400 si no hay mensajes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Test", email: "test@marmaq.mx", role: "TECNICO" },
    });

    const req = createRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Mensajes requeridos");
  });

  it("devuelve 400 si mensajes es un array vacío", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Test", email: "test@marmaq.mx", role: "TECNICO" },
    });

    const req = createRequest({ messages: [] });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Mensajes requeridos");
  });

  it("devuelve 400 si mensajes no es un array", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Test", email: "test@marmaq.mx", role: "TECNICO" },
    });

    const req = createRequest({ messages: "hola" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Mensajes requeridos");
  });

  it("devuelve 200 con respuesta del asistente", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Test", email: "test@marmaq.mx", role: "TECNICO" },
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "¡Hola! Soy el asistente de MARMAQ." }],
    });

    const req = createRequest({
      messages: [{ role: "user", content: "Hola" }],
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("¡Hola! Soy el asistente de MARMAQ.");
  });

  it("envía los mensajes correctamente a la API de Claude", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Test", email: "test@marmaq.mx", role: "SUPER_ADMIN" },
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Respuesta" }],
    });

    const messages = [
      { role: "user", content: "¿Cómo creo una orden?" },
      { role: "assistant", content: "Para crear una orden..." },
      { role: "user", content: "Gracias, ¿y cómo asigno un técnico?" },
    ];

    const req = createRequest({ messages });
    await POST(req);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: expect.stringContaining("MARMAQ"),
        messages: messages.map(({ role, content }) => ({ role, content })),
      })
    );
  });

  it("limita a los últimos 20 mensajes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Test", email: "test@marmaq.mx", role: "TECNICO" },
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "OK" }],
    });

    // Crear 30 mensajes
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Mensaje ${i}`,
    }));

    const req = createRequest({ messages });
    await POST(req);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(20);
    expect(callArgs.messages[0].content).toBe("Mensaje 10");
  });

  it("devuelve 500 si la API de Claude falla", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Test", email: "test@marmaq.mx", role: "TECNICO" },
    });

    mockCreate.mockRejectedValue(new Error("API Error"));

    const req = createRequest({
      messages: [{ role: "user", content: "Hola" }],
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al procesar el mensaje");
  });
});
