import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import {
  calcularSemaforo,
  type OrdenesListResponse,
  type OrdenesFilters,
  type OrdenListItem,
  type SemaforoColor,
} from "@/types/ordenes";
import { Prisma, EstadoOrden, TipoServicio, Prioridad } from "@prisma/client";
import {
  crearOrdenConFolio,
  FolioGenerationError,
} from "@/lib/utils/folio-generator";
import { notificarOrdenCreada } from "@/lib/notificaciones/notification-triggers";
import { CreateOrdenSchema } from "@/lib/validators/ordenes";
import { checkRole, unauthorizedResponse, getUserRole } from "@/lib/auth/authorize";

// ============ GET /api/ordenes ============
// Lista órdenes con filtros, paginación y cálculo de semáforo
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userRole = getUserRole(session);

    // Parsear filtros
    const filters: OrdenesFilters = {
      tipoServicio: searchParams.get("tipoServicio") as TipoServicio | undefined,
      estado: searchParams.get("estado") as EstadoOrden | undefined,
      prioridad: searchParams.get("prioridad") as Prioridad | undefined,
      tecnicoId: searchParams.get("tecnicoId") || undefined,
      clienteId: searchParams.get("clienteId") || undefined,
      search: searchParams.get("search") || undefined,
      semaforo: searchParams.get("semaforo") as SemaforoColor | undefined,
      fechaDesde: searchParams.get("fechaDesde") || undefined,
      fechaHasta: searchParams.get("fechaHasta") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "20"),
    };

    // Construir where clause
    const where: Prisma.OrdenWhereInput = {};

    // RBAC: TECNICO solo puede ver sus órdenes asignadas
    if (userRole === "TECNICO") {
      where.tecnicoId = session.user.id;
    }

    if (filters.tipoServicio) {
      where.tipoServicio = filters.tipoServicio;
    }

    if (filters.estado) {
      where.estado = filters.estado;
    }

    if (filters.prioridad) {
      where.prioridad = filters.prioridad;
    }

    if (filters.tecnicoId) {
      // Si es TECNICO, ignorar el filtro manual (ya está forzado por RBAC arriba)
      if (userRole !== "TECNICO") {
        where.tecnicoId = filters.tecnicoId;
      }
    }

    if (filters.clienteId) {
      where.clienteId = filters.clienteId;
    }

    if (filters.fechaDesde || filters.fechaHasta) {
      where.fechaRecepcion = {};
      if (filters.fechaDesde) {
        where.fechaRecepcion.gte = new Date(filters.fechaDesde);
      }
      if (filters.fechaHasta) {
        where.fechaRecepcion.lte = new Date(filters.fechaHasta);
      }
    }

    // Búsqueda por texto (folio, cliente, equipo)
    if (filters.search) {
      where.OR = [
        { folio: { contains: filters.search, mode: "insensitive" } },
        { cliente: { nombre: { contains: filters.search, mode: "insensitive" } } },
        { cliente: { empresa: { contains: filters.search, mode: "insensitive" } } },
        { marcaEquipo: { contains: filters.search, mode: "insensitive" } },
        { modeloEquipo: { contains: filters.search, mode: "insensitive" } },
        { serieEquipo: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Paginación
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100); // Max 100
    const skip = (page - 1) * pageSize;

    // Si hay filtro de semáforo, necesitamos obtener todas las órdenes primero
    // porque el semáforo se calcula en memoria, no en la BD
    const hasSemaforoFilter = !!filters.semaforo;

    // Ejecutar queries
    const [ordenes, totalSinFiltroSemaforo] = await Promise.all([
      prisma.orden.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              empresa: true,
              telefono: true,
            },
          },
          tecnico: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              evidencias: true,
            },
          },
        },
        orderBy: [
          { prioridad: "desc" },
          { fechaRecepcion: "desc" },
        ],
        // Solo aplicar paginación en BD si NO hay filtro de semáforo
        ...(hasSemaforoFilter ? {} : { skip, take: pageSize }),
      }),
      prisma.orden.count({ where }),
    ]);

    // Calcular semáforo para cada orden
    let ordenesConSemaforo: OrdenListItem[] = ordenes.map((orden) => ({
      ...orden,
      semaforo: calcularSemaforo(orden),
    }));

    let total = totalSinFiltroSemaforo;

    // Si hay filtro de semáforo, filtrar y paginar en memoria
    if (hasSemaforoFilter) {
      // Filtrar por semáforo
      ordenesConSemaforo = ordenesConSemaforo.filter(
        (orden) => orden.semaforo === filters.semaforo
      );
      // Actualizar total con el conteo filtrado
      total = ordenesConSemaforo.length;
      // Aplicar paginación manualmente
      ordenesConSemaforo = ordenesConSemaforo.slice(skip, skip + pageSize);
    }

    const response: OrdenesListResponse = {
      ordenes: ordenesConSemaforo,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching ordenes:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes" },
      { status: 500 }
    );
  }
}

// ============ POST /api/ordenes ============
// Crear nueva orden con generación automática de folio
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // RBAC: Solo SUPER_ADMIN, COORD_SERVICIO y REFACCIONES pueden crear órdenes
    if (!checkRole(session, ["SUPER_ADMIN", "COORD_SERVICIO", "REFACCIONES"])) {
      return unauthorizedResponse("No tienes permisos para crear órdenes");
    }

    const rawBody = await request.json();
    const parsed = CreateOrdenSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Usar transacción para asegurar integridad
    const orden = await prisma.$transaction(async (tx) => {
      // 1. Obtener o crear cliente
      let clienteId = body.clienteId;

      if (!clienteId && body.clienteNuevo) {
        const nuevoCliente = await tx.cliente.create({
          data: {
            nombre: body.clienteNuevo.nombre,
            empresa: body.clienteNuevo.empresa,
            telefono: body.clienteNuevo.telefono,
            email: body.clienteNuevo.email,
            direccion: body.clienteNuevo.direccion,
            ciudad: body.clienteNuevo.ciudad,
            esDistribuidor: body.clienteNuevo.esDistribuidor || false,
            codigoDistribuidor: body.clienteNuevo.codigoDistribuidor,
          },
        });
        clienteId = nuevoCliente.id;
      }

      // 2. Crear la orden con folio automático (con retry para race conditions)
      // Formato: OS-{YEAR}-{NNNN} (ej: OS-2025-0001)
      const nuevaOrden = await crearOrdenConFolio({
        tx,
        orderData: {
          tipoServicio: body.tipoServicio,
          prioridad: body.prioridad || "NORMAL",
          cliente: { connect: { id: clienteId! } },
          creadoPor: { connect: { id: session.user.id } },
          tecnico: body.tecnicoId ? { connect: { id: body.tecnicoId } } : undefined,
          // Equipo
          marcaEquipo: body.marcaEquipo,
          modeloEquipo: body.modeloEquipo,
          serieEquipo: body.serieEquipo,
          condicionEquipo: body.condicionEquipo || "REGULAR",
          accesorios: body.accesorios || {},
          // Problema
          fallaReportada: body.fallaReportada,
          // Garantía
          numeroFactura: body.numeroFactura,
          fechaFactura: body.fechaFactura ? new Date(body.fechaFactura) : null,
          // REPARE
          numeroRepare: body.numeroRepare,
          coordenadasGPS: body.coordenadasGPS,
          // Fechas
          fechaPromesa: body.fechaPromesa ? new Date(body.fechaPromesa) : null,
        },
        include: {
          cliente: true,
          tecnico: {
            select: { id: true, name: true },
          },
          creadoPor: {
            select: { id: true, name: true },
          },
        },
      });

      // 3. Crear registro en historial de estados
      await tx.historialEstado.create({
        data: {
          ordenId: nuevaOrden.id,
          estadoAnterior: null,
          estadoNuevo: "RECIBIDO",
          usuarioId: session.user.id,
          notas: "Orden creada",
        },
      });

      // 4. Crear registro en historial completo de orden
      await tx.historialOrden.create({
        data: {
          ordenId: nuevaOrden.id,
          usuarioId: session.user.id,
          accion: "ORDEN_CREADA",
          detalles: {
            folio: nuevaOrden.folio,
            tipoServicio: nuevaOrden.tipoServicio,
            cliente: body.clienteNuevo?.nombre || "Cliente existente",
            equipo: `${nuevaOrden.marcaEquipo} ${nuevaOrden.modeloEquipo}`,
          },
        },
      });

      return nuevaOrden;
    });

    // Disparar notificación (fire-and-forget, no bloquea el response)
    notificarOrdenCreada(
      {
        id: orden.id,
        folio: orden.folio,
        tecnicoId: orden.tecnicoId,
        marcaEquipo: orden.marcaEquipo,
        modeloEquipo: orden.modeloEquipo,
      },
      session.user.id
    ).catch(() => {}); // Silenciar errores — best effort

    return NextResponse.json(orden, { status: 201 });
  } catch (error) {
    console.error("Error creating orden:", error);

    // Handle folio generation exhausted retries
    if (error instanceof FolioGenerationError) {
      return NextResponse.json(
        { error: "No se pudo generar un folio único. Intente de nuevo." },
        { status: 409 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe una orden con ese folio" },
          { status: 409 }
        );
      }
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Cliente o técnico no encontrado" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error al crear la orden" },
      { status: 500 }
    );
  }
}
