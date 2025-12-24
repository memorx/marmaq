import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { Role, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/usuarios - Listar usuarios (técnicos para asignación)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const activos = searchParams.get("activos") !== "false"; // Por defecto solo activos

    const where: Prisma.UserWhereInput = {};

    // Filtrar por rol si se especifica
    if (role) {
      const roles = role.split(",").filter((r): r is Role =>
        ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES", "TECNICO"].includes(r)
      );
      if (roles.length > 0) {
        where.role = { in: roles };
      }
    }

    // Filtrar por activos
    if (activos) {
      where.activo = true;
    }

    const usuarios = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        activo: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("Error fetching usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}
