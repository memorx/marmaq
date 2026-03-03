import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { getChatResponse } from "@/lib/chat/anthropic";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const { mensaje } = body as { mensaje: string };

    if (!mensaje || typeof mensaje !== "string" || !mensaje.trim()) {
      return NextResponse.json(
        { error: "Mensaje requerido" },
        { status: 400 }
      );
    }

    let conversacion = await prisma.chatConversation.findUnique({
      where: { id },
      include: { _count: { select: { mensajes: true } } },
    });

    if (!conversacion) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    // Only owner can send messages
    if (conversacion.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    let conversacionId = conversacion.id;

    // If >=100 messages, archive and create new
    if (conversacion._count.mensajes >= 100) {
      await prisma.chatConversation.update({
        where: { id: conversacion.id },
        data: { activa: false },
      });

      const nueva = await prisma.chatConversation.create({
        data: {
          usuarioId: session.user.id!,
          titulo: mensaje.trim().slice(0, 50),
        },
      });

      conversacionId = nueva.id;
      conversacion = { ...conversacion, id: nueva.id, _count: { mensajes: 0 } };
    }

    // Create USER message
    await prisma.chatMessage.create({
      data: {
        conversacionId,
        role: "USER",
        content: mensaje.trim(),
      },
    });

    // Load last 20 messages for context
    const recentMessages = await prisma.chatMessage.findMany({
      where: { conversacionId },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { role: true, content: true },
    });

    const chatMessages = recentMessages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    const respuesta = await getChatResponse(chatMessages);

    // Save ASSISTANT message
    await prisma.chatMessage.create({
      data: {
        conversacionId,
        role: "ASSISTANT",
        content: respuesta,
      },
    });

    // Touch updatedAt
    await prisma.chatConversation.update({
      where: { id: conversacionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ respuesta, conversacionId });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    return NextResponse.json(
      { error: "Error al enviar mensaje" },
      { status: 500 }
    );
  }
}
