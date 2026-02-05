import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { Role, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CreateUsuarioSchema } from "@/lib/validators/usuarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROLES_VALIDOS: Role[] = ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES", "TECNICO"];

// GET /api/usuarios - Listar usuarios
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const activos = searchParams.get("activos");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where: Prisma.UserWhereInput = {};

    // Filtrar por rol si se especifica
    if (role) {
      const roles = role.split(",").filter((r): r is Role =>
        ROLES_VALIDOS.includes(r as Role)
      );
      if (roles.length > 0) {
        where.role = { in: roles };
      }
    }

    // Filtrar por activos (por defecto todos)
    if (activos === "true") {
      where.activo = true;
    } else if (activos === "false") {
      where.activo = false;
    }

    // Búsqueda por nombre o email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Contar total
    const total = await prisma.user.count({ where });

    // Obtener usuarios paginados
    const usuarios = await prisma.user.findMany({
      where,
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
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      usuarios,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// POST /api/usuarios - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo SUPER_ADMIN puede crear usuarios
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para crear usuarios" },
        { status: 403 }
      );
    }

    const rawBody = await request.json();
    const parsed = CreateUsuarioSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Crear usuario
    const usuario = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        password: hashedPassword,
        role: body.role,
        activo: body.activo,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        activo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    console.error("Error creating usuario:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un usuario con ese email" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}
