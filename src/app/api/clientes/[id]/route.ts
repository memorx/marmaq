import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { UpdateClienteSchema } from "@/lib/validators/clientes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = Promise<{ id: string }>;

// GET /api/clientes/[id] - Obtener un cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        ordenes: {
          select: {
            id: true,
            folio: true,
            tipoServicio: true,
            estado: true,
            marcaEquipo: true,
            modeloEquipo: true,
            fechaRecepcion: true,
          },
          orderBy: { fechaRecepcion: "desc" },
          take: 10,
        },
        _count: {
          select: { ordenes: true },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("Error fetching cliente:", error);
    return NextResponse.json(
      { error: "Error al obtener cliente" },
      { status: 500 }
    );
  }
}

// PATCH /api/clientes/[id] - Actualizar cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const rawBody = await request.json();
    const parsed = UpdateClienteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Verificar que el cliente existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: Prisma.ClienteUpdateInput = {};

    if (body.nombre !== undefined) {
      updateData.nombre = body.nombre;
    }
    if (body.empresa !== undefined) {
      updateData.empresa = body.empresa || null;
    }
    if (body.telefono !== undefined) {
      updateData.telefono = body.telefono;
    }
    if (body.email !== undefined) {
      updateData.email = body.email || null;
    }
    if (body.direccion !== undefined) {
      updateData.direccion = body.direccion || null;
    }
    if (body.ciudad !== undefined) {
      updateData.ciudad = body.ciudad || null;
    }
    if (body.esDistribuidor !== undefined) {
      updateData.esDistribuidor = body.esDistribuidor;
    }
    if (body.codigoDistribuidor !== undefined) {
      updateData.codigoDistribuidor = body.codigoDistribuidor || null;
    }
    if (body.notas !== undefined) {
      updateData.notas = body.notas || null;
    }

    // Actualizar cliente
    const cliente = await prisma.cliente.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("Error updating cliente:", error);
    return NextResponse.json(
      { error: "Error al actualizar cliente" },
      { status: 500 }
    );
  }
}

// DELETE /api/clientes/[id] - Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo admins pueden eliminar clientes
    const allowedRoles = ["SUPER_ADMIN", "COORD_SERVICIO"];
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar clientes" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: {
          select: { ordenes: true },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // No permitir eliminar si tiene órdenes
    if (cliente._count.ordenes > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el cliente porque tiene ${cliente._count.ordenes} orden(es) asociada(s)`,
        },
        { status: 400 }
      );
    }

    // Eliminar cliente
    await prisma.cliente.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Cliente eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting cliente:", error);
    return NextResponse.json(
      { error: "Error al eliminar cliente" },
      { status: 500 }
    );
  }
}
