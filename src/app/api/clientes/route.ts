import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { CreateClienteSchema } from "@/lib/validators/clientes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/clientes - Listar clientes con búsqueda y paginación
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const esDistribuidor = searchParams.get("esDistribuidor");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    // Construir filtro
    const where: Prisma.ClienteWhereInput = {};

    // Búsqueda por nombre, empresa, teléfono o email
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { empresa: { contains: search, mode: "insensitive" } },
        { telefono: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filtro por tipo de cliente
    if (esDistribuidor === "true") {
      where.esDistribuidor = true;
    } else if (esDistribuidor === "false") {
      where.esDistribuidor = false;
    }

    // Contar total
    const total = await prisma.cliente.count({ where });

    // Obtener clientes paginados
    const clientes = await prisma.cliente.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        empresa: true,
        telefono: true,
        email: true,
        direccion: true,
        ciudad: true,
        esDistribuidor: true,
        codigoDistribuidor: true,
        notas: true,
        createdAt: true,
        _count: {
          select: { ordenes: true },
        },
      },
      orderBy: { nombre: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      clientes,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching clientes:", error);
    return NextResponse.json(
      { error: "Error al obtener clientes" },
      { status: 500 }
    );
  }
}

// POST /api/clientes - Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = CreateClienteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Crear cliente
    const cliente = await prisma.cliente.create({
      data: {
        nombre: body.nombre,
        empresa: body.empresa || null,
        telefono: body.telefono,
        email: body.email || null,
        direccion: body.direccion || null,
        ciudad: body.ciudad || null,
        esDistribuidor: body.esDistribuidor,
        codigoDistribuidor: body.codigoDistribuidor || null,
        notas: body.notas || null,
      },
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error("Error creating cliente:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un cliente con estos datos" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error al crear cliente" },
      { status: 500 }
    );
  }
}
