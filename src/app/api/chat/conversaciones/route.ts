import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { getChatResponse } from "@/lib/chat/anthropic";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activa = searchParams.get("activa");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const all = searchParams.get("all") === "true";

    const where: Record<string, unknown> = {};

    if (all && session.user.role === "SUPER_ADMIN") {
      // Admin ve todas
    } else {
      where.usuarioId = session.user.id;
    }

    if (activa !== null) {
      where.activa = activa === "true";
    }

    const conversaciones = await prisma.chatConversation.findMany({
      where,
      include: {
        _count: { select: { mensajes: true } },
        usuario: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ conversaciones });
  } catch (error) {
    console.error("Error al listar conversaciones:", error);
    return NextResponse.json(
      { error: "Error al listar conversaciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { mensaje } = body as { mensaje: string };

    if (!mensaje || typeof mensaje !== "string" || !mensaje.trim()) {
      return NextResponse.json(
        { error: "Mensaje requerido" },
        { status: 400 }
      );
    }

    const conversacion = await prisma.chatConversation.create({
      data: {
        usuarioId: session.user.id!,
        titulo: mensaje.trim().slice(0, 50),
        mensajes: {
          create: {
            role: "USER",
            content: mensaje.trim(),
          },
        },
      },
    });

    const respuesta = await getChatResponse([
      { role: "user", content: mensaje.trim() },
    ]);

    await prisma.chatMessage.create({
      data: {
        conversacionId: conversacion.id,
        role: "ASSISTANT",
        content: respuesta,
      },
    });

    // Touch updatedAt
    await prisma.chatConversation.update({
      where: { id: conversacion.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(
      {
        conversacion: { id: conversacion.id, titulo: conversacion.titulo },
        respuesta,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear conversación:", error);
    return NextResponse.json(
      { error: "Error al crear conversación" },
      { status: 500 }
    );
  }
}
