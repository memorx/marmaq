import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UpdateUsuarioSchema } from "@/lib/validators/usuarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = Promise<{ id: string }>;

// GET /api/usuarios/[id] - Obtener un usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo SUPER_ADMIN puede ver detalles de otros usuarios
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para ver usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const usuario = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ordenesAsignadas: true,
            ordenesCreadas: true,
          },
        },
        ordenesAsignadas: {
          select: {
            id: true,
            folio: true,
            estado: true,
            tipoServicio: true,
            cliente: {
              select: {
                nombre: true,
              },
            },
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("Error fetching usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}

// PATCH /api/usuarios/[id] - Actualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo SUPER_ADMIN puede editar usuarios
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para editar usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const rawBody = await request.json();
    const parsed = UpdateUsuarioSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Verificar que el usuario existe
    const usuarioExistente = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // No permitir que un admin se quite su propio rol de SUPER_ADMIN
    if (
      id === session.user.id &&
      usuarioExistente.role === "SUPER_ADMIN" &&
      body.role &&
      body.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "No puedes quitarte tu propio rol de administrador" },
        { status: 400 }
      );
    }

    // No permitir desactivarse a sí mismo
    if (id === session.user.id && body.activo === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      );
    }

    // Preparar datos de actualización
    const updateData: Prisma.UserUpdateInput = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.email !== undefined) {
      updateData.email = body.email.toLowerCase().trim();
    }
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }
    if (body.role !== undefined) {
      updateData.role = body.role;
    }
    if (body.activo !== undefined) {
      updateData.activo = body.activo;
    }

    // Actualizar usuario
    const usuario = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("Error updating usuario:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un usuario con ese email" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// DELETE /api/usuarios/[id] - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo SUPER_ADMIN puede eliminar usuarios
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // No permitir eliminarse a sí mismo
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe y obtener sus órdenes
    const usuario = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ordenesAsignadas: true,
            ordenesCreadas: true,
            historialCambios: true,
          },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // No permitir eliminar si tiene órdenes asociadas
    const totalOrdenes = usuario._count.ordenesAsignadas + usuario._count.ordenesCreadas;
    if (totalOrdenes > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el usuario porque tiene ${totalOrdenes} orden(es) asociada(s). Considera desactivarlo en su lugar.`,
        },
        { status: 400 }
      );
    }

    // Eliminar usuario
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting usuario:", error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}
