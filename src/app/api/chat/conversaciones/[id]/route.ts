import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const conversacion = await prisma.chatConversation.findUnique({
      where: { id },
      include: {
        mensajes: { orderBy: { createdAt: "asc" } },
        usuario: { select: { name: true } },
      },
    });

    if (!conversacion) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    // RBAC: owner or SUPER_ADMIN
    if (
      conversacion.usuarioId !== session.user.id &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    return NextResponse.json({ conversacion });
  } catch (error) {
    console.error("Error al obtener conversación:", error);
    return NextResponse.json(
      { error: "Error al obtener conversación" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const conversacion = await prisma.chatConversation.findUnique({
      where: { id },
    });

    if (!conversacion) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    // RBAC: owner or SUPER_ADMIN
    if (
      conversacion.usuarioId !== session.user.id &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    await prisma.chatConversation.update({
      where: { id },
      data: { activa: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al archivar conversación:", error);
    return NextResponse.json(
      { error: "Error al archivar conversación" },
      { status: 500 }
    );
  }
}
