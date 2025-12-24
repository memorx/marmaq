import { PrismaClient, Role, TipoServicio, EstadoOrden, Prioridad, CondicionEquipo } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

// Prisma 7 requiere un driver adapter para PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // Limpiar datos existentes (en orden por dependencias)
  await prisma.historialEstado.deleteMany();
  await prisma.materialUsado.deleteMany();
  await prisma.evidencia.deleteMany();
  await prisma.orden.deleteMany();
  await prisma.material.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.user.deleteMany();
  await prisma.configuracion.deleteMany();

  console.log("🧹 Datos anteriores eliminados");

  // Crear usuarios
  const hashedPassword = await bcrypt.hash("marmaq2024", 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@marmaq.mx",
        name: "Guillermo Jaramillo",
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        activo: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "ricardo@marmaq.mx",
        name: "Ricardo Castillo",
        password: hashedPassword,
        role: Role.COORD_SERVICIO,
        activo: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "magali@marmaq.mx",
        name: "Magali González",
        password: hashedPassword,
        role: Role.COORD_SERVICIO,
        activo: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "roberto@marmaq.mx",
        name: "Roberto Hernández",
        password: hashedPassword,
        role: Role.REFACCIONES,
        activo: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "benito@marmaq.mx",
        name: "Benito García",
        password: hashedPassword,
        role: Role.TECNICO,
        activo: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "carlos@marmaq.mx",
        name: "Carlos Mendoza",
        password: hashedPassword,
        role: Role.TECNICO,
        activo: true,
      },
    }),
  ]);

  const [admin, coord1, coord2, refacciones, tecnico1, tecnico2] = users;
  console.log(`👥 ${users.length} usuarios creados`);

  // Crear clientes
  const clientes = await Promise.all([
    prisma.cliente.create({
      data: {
        nombre: "Juan Pérez",
        empresa: "Carnicería El Toro",
        telefono: "33 1234 5678",
        email: "contacto@carniceriaeltoro.com",
        direccion: "Av. Revolución 123",
        ciudad: "Guadalajara",
        esDistribuidor: false,
      },
    }),
    prisma.cliente.create({
      data: {
        nombre: "María García",
        empresa: "Gastroequipos GDL",
        telefono: "33 9876 5432",
        email: "ventas@gastroequiposgdl.com",
        direccion: "Calz. del Federalismo 456",
        ciudad: "Guadalajara",
        esDistribuidor: true,
        codigoDistribuidor: "DIST-001",
      },
    }),
    prisma.cliente.create({
      data: {
        nombre: "Pedro Sánchez",
        empresa: "Pollería San Juan",
        telefono: "33 2345 6789",
        email: "pedidos@polleriasanjuan.com",
        direccion: "Calle Morelos 789",
        ciudad: "Zapopan",
        esDistribuidor: false,
      },
    }),
    prisma.cliente.create({
      data: {
        nombre: "Ana López",
        empresa: "Restaurante La Patrona",
        telefono: "33 3456 7890",
        email: "reservaciones@lapatrona.mx",
        direccion: "Av. Vallarta 1010",
        ciudad: "Guadalajara",
        esDistribuidor: false,
      },
    }),
    prisma.cliente.create({
      data: {
        nombre: "Carmen Ruiz",
        empresa: "Cremería Lupita",
        telefono: "33 4567 8901",
        email: "cremeria.lupita@gmail.com",
        direccion: "Mercado San Juan de Dios Local 42",
        ciudad: "Guadalajara",
        esDistribuidor: false,
      },
    }),
    prisma.cliente.create({
      data: {
        nombre: "Fernando Díaz",
        empresa: "Abarrotes Don Fer",
        telefono: "33 5678 9012",
        email: "abarrotes.donfer@hotmail.com",
        direccion: "Calle Hidalgo 234",
        ciudad: "Tlaquepaque",
        esDistribuidor: false,
      },
    }),
  ]);

  console.log(`🏪 ${clientes.length} clientes creados`);

  // Crear materiales
  const materiales = await Promise.all([
    prisma.material.create({
      data: {
        sku: "CEL-40K-01",
        nombre: "Celda de carga 40kg",
        descripcion: "Celda de carga para báscula Torrey LEQ-40",
        categoria: "Básculas",
        stockActual: 3,
        stockMinimo: 5,
        precioCompra: 650,
        precioVenta: 850,
      },
    }),
    prisma.material.create({
      data: {
        sku: "ENG-M22-03",
        nombre: "Engrane principal M-22",
        descripcion: "Engrane de transmisión para molino Torrey M-22",
        categoria: "Molinos",
        stockActual: 8,
        stockMinimo: 3,
        precioCompra: 320,
        precioVenta: 420,
      },
    }),
    prisma.material.create({
      data: {
        sku: "ACE-MOL-01",
        nombre: "Aceite para molino 1L",
        descripcion: "Aceite grado alimenticio para molinos",
        categoria: "Consumibles",
        stockActual: 25,
        stockMinimo: 10,
        precioCompra: 120,
        precioVenta: 180,
      },
    }),
    prisma.material.create({
      data: {
        sku: "BAT-LEQ-10",
        nombre: "Batería báscula L-EQ",
        descripcion: "Batería recargable 6V para báscula Torrey L-EQ",
        categoria: "Básculas",
        stockActual: 15,
        stockMinimo: 5,
        precioCompra: 250,
        precioVenta: 350,
      },
    }),
    prisma.material.create({
      data: {
        sku: "CMP-REF-01",
        nombre: "Compresor 1/3 HP",
        descripcion: "Compresor para refrigerador comercial",
        categoria: "Refrigeración",
        stockActual: 2,
        stockMinimo: 3,
        precioCompra: 1800,
        precioVenta: 2450,
      },
    }),
    prisma.material.create({
      data: {
        sku: "CUC-R300-02",
        nombre: "Cuchilla para rebanadora R-300",
        descripcion: "Cuchilla de acero inoxidable para rebanadora Torrey R-300",
        categoria: "Rebanadoras",
        stockActual: 4,
        stockMinimo: 2,
        precioCompra: 890,
        precioVenta: 1150,
      },
    }),
  ]);

  console.log(`📦 ${materiales.length} materiales creados`);

  // Crear configuración inicial
  await prisma.configuracion.createMany({
    data: [
      { clave: "dias_alerta_rojo", valor: "5", descripcion: "Días para alerta roja (equipo listo sin recoger)" },
      { clave: "horas_alerta_amarillo", valor: "72", descripcion: "Horas para alerta amarilla (sin cotización)" },
      { clave: "notificar_cliente_whatsapp", valor: "false", descripcion: "Enviar notificaciones por WhatsApp" },
      { clave: "notificar_cliente_email", valor: "true", descripcion: "Enviar notificaciones por Email" },
    ],
  });

  console.log("⚙️ Configuración inicial creada");

  // =============== ÓRDENES DE EJEMPLO ===============

  // Orden 1: GARANTÍA - LISTO_ENTREGA (más de 5 días - SEMÁFORO ROJO)
  const orden1 = await prisma.orden.create({
    data: {
      folio: "OS-2024-0001",
      tipoServicio: TipoServicio.GARANTIA,
      estado: EstadoOrden.LISTO_ENTREGA,
      prioridad: Prioridad.ALTA,
      clienteId: clientes[0].id,
      tecnicoId: tecnico1.id,
      creadoPorId: admin.id,
      marcaEquipo: "Torrey",
      modeloEquipo: "L-EQ 10/20",
      serieEquipo: "LEQ-2024-001234",
      accesorios: { plato: true, eliminador: true, antena: false, candado: true },
      condicionEquipo: CondicionEquipo.REGULAR,
      fallaReportada: "No enciende, cliente reporta que dejó de funcionar después de una descarga eléctrica",
      diagnostico: "Fuente de poder dañada por sobrecarga eléctrica. Se detectó quemadura en capacitor principal.",
      notasTecnico: "Se reemplazó fuente de poder completa. Equipo funcionando correctamente. Se recomienda usar regulador de voltaje.",
      numeroFactura: "FAC-2024-5678",
      fechaFactura: new Date("2024-06-15"),
      fechaRecepcion: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 días
      fechaReparacion: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días
    },
  });

  // Orden 2: CENTRO_SERVICIO - ESPERA_REFACCIONES (SEMÁFORO NARANJA)
  const orden2 = await prisma.orden.create({
    data: {
      folio: "OS-2024-0002",
      tipoServicio: TipoServicio.CENTRO_SERVICIO,
      estado: EstadoOrden.ESPERA_REFACCIONES,
      prioridad: Prioridad.NORMAL,
      clienteId: clientes[1].id, // Distribuidor
      tecnicoId: tecnico1.id,
      creadoPorId: coord1.id,
      marcaEquipo: "Torrey",
      modeloEquipo: "M-22 R2",
      serieEquipo: "M22-2023-009876",
      condicionEquipo: CondicionEquipo.MALA,
      fallaReportada: "Engrane roto, hace ruido metálico fuerte al moler. Cliente indica que trabaja desde hace 5 años sin mantenimiento.",
      diagnostico: "Engrane principal con dientes rotos. Cojinete del eje presenta desgaste. Se requiere kit de engranes y cojinete nuevo.",
      notasTecnico: "Equipo muy maltratado. Se solicitó refacción ENG-M22-03 a almacén. Esperar 3-5 días hábiles.",
      fechaRecepcion: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  // Orden 3: POR_COBRAR - EN_DIAGNOSTICO (más de 72h - SEMÁFORO AMARILLO)
  const orden3 = await prisma.orden.create({
    data: {
      folio: "OS-2024-0003",
      tipoServicio: TipoServicio.POR_COBRAR,
      estado: EstadoOrden.EN_DIAGNOSTICO,
      prioridad: Prioridad.NORMAL,
      clienteId: clientes[2].id,
      tecnicoId: tecnico2.id,
      creadoPorId: admin.id,
      marcaEquipo: "Torrey",
      modeloEquipo: "R-300 A",
      serieEquipo: "R300-2022-005432",
      condicionEquipo: CondicionEquipo.REGULAR,
      fallaReportada: "Rebanadora no corta parejo, las rebanadas salen de diferente grosor. También hace un sonido extraño.",
      notasTecnico: "Revisando alineación de cuchilla y mecanismo de ajuste de grosor.",
      fechaRecepcion: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 días - más de 72h
    },
  });

  // Orden 4: GARANTÍA - EN_REPARACION
  const orden4 = await prisma.orden.create({
    data: {
      folio: "OS-2024-0004",
      tipoServicio: TipoServicio.GARANTIA,
      estado: EstadoOrden.EN_REPARACION,
      prioridad: Prioridad.ALTA,
      clienteId: clientes[3].id,
      tecnicoId: tecnico1.id,
      creadoPorId: coord2.id,
      marcaEquipo: "Torrey",
      modeloEquipo: "LEQ-40/80",
      serieEquipo: "LEQ40-2024-002345",
      accesorios: { plato: true, eliminador: true, antena: true, candado: true, modulo: true },
      condicionEquipo: CondicionEquipo.BUENA,
      fallaReportada: "Display muestra error E-03 intermitente. A veces funciona normal.",
      diagnostico: "Celda de carga con cable dañado. Falso contacto provoca lecturas erróneas.",
      notasTecnico: "Procediendo a reemplazar celda de carga. Equipo en proceso de calibración.",
      numeroFactura: "FAC-2024-7890",
      fechaFactura: new Date("2024-08-20"),
      fechaRecepcion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Orden 5: REPARE - RECIBIDO (hoy - SEMÁFORO AZUL)
  const orden5 = await prisma.orden.create({
    data: {
      folio: "OS-2024-0005",
      tipoServicio: TipoServicio.REPARE,
      estado: EstadoOrden.RECIBIDO,
      prioridad: Prioridad.URGENTE,
      clienteId: clientes[4].id,
      creadoPorId: admin.id,
      marcaEquipo: "Imbera",
      modeloEquipo: "VR-17",
      serieEquipo: "VR17-2023-112233",
      condicionEquipo: CondicionEquipo.MALA,
      fallaReportada: "Refrigerador no enfría, compresor no arranca. Producto en riesgo de echarse a perder.",
      numeroRepare: "REP-2024-1234",
      coordenadasGPS: "20.6597,-103.3496",
      fechaRecepcion: new Date(), // Hoy
    },
  });

  // Orden 6: POR_COBRAR - COTIZACION_PENDIENTE
  const orden6 = await prisma.orden.create({
    data: {
      folio: "OS-2024-0006",
      tipoServicio: TipoServicio.POR_COBRAR,
      estado: EstadoOrden.COTIZACION_PENDIENTE,
      prioridad: Prioridad.NORMAL,
      clienteId: clientes[5].id,
      tecnicoId: tecnico2.id,
      creadoPorId: coord1.id,
      marcaEquipo: "Migsa",
      modeloEquipo: "SL-300",
      serieEquipo: "SL300-2021-887766",
      condicionEquipo: CondicionEquipo.REGULAR,
      fallaReportada: "Sierra de hueso no corta bien, se atora con huesos duros",
      diagnostico: "Banda de transmisión estirada y hoja de sierra desgastada. Se requiere reemplazo de ambas piezas.",
      notasTecnico: "Cotización enviada al cliente: $1,850 MXN incluyendo mano de obra. Esperando aprobación.",
      cotizacion: 1850.00,
      cotizacionAprobada: false,
      fechaRecepcion: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const ordenes = [orden1, orden2, orden3, orden4, orden5, orden6];
  console.log(`📋 ${ordenes.length} órdenes creadas`);

  // =============== HISTORIAL DE ESTADOS ===============

  // Historial para orden 1 (LISTO_ENTREGA)
  await prisma.historialEstado.createMany({
    data: [
      {
        ordenId: orden1.id,
        estadoAnterior: null,
        estadoNuevo: EstadoOrden.RECIBIDO,
        usuarioId: admin.id,
        notas: "Orden creada - Equipo recibido en mostrador",
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        ordenId: orden1.id,
        estadoAnterior: EstadoOrden.RECIBIDO,
        estadoNuevo: EstadoOrden.EN_DIAGNOSTICO,
        usuarioId: tecnico1.id,
        notas: "Iniciando diagnóstico del equipo",
        createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      },
      {
        ordenId: orden1.id,
        estadoAnterior: EstadoOrden.EN_DIAGNOSTICO,
        estadoNuevo: EstadoOrden.EN_REPARACION,
        usuarioId: tecnico1.id,
        notas: "Fuente de poder identificada como causa. Procediendo a reparar.",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        ordenId: orden1.id,
        estadoAnterior: EstadoOrden.EN_REPARACION,
        estadoNuevo: EstadoOrden.REPARADO,
        usuarioId: tecnico1.id,
        notas: "Reparación completada. Equipo probado y funcionando.",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        ordenId: orden1.id,
        estadoAnterior: EstadoOrden.REPARADO,
        estadoNuevo: EstadoOrden.LISTO_ENTREGA,
        usuarioId: coord1.id,
        notas: "Equipo listo para entrega. Se notificó al cliente.",
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Historial para orden 2 (ESPERA_REFACCIONES)
  await prisma.historialEstado.createMany({
    data: [
      {
        ordenId: orden2.id,
        estadoAnterior: null,
        estadoNuevo: EstadoOrden.RECIBIDO,
        usuarioId: coord1.id,
        notas: "Orden creada - Equipo traído por distribuidor",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        ordenId: orden2.id,
        estadoAnterior: EstadoOrden.RECIBIDO,
        estadoNuevo: EstadoOrden.EN_DIAGNOSTICO,
        usuarioId: tecnico1.id,
        notas: "Equipo en mesa de trabajo para diagnóstico",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        ordenId: orden2.id,
        estadoAnterior: EstadoOrden.EN_DIAGNOSTICO,
        estadoNuevo: EstadoOrden.ESPERA_REFACCIONES,
        usuarioId: refacciones.id,
        notas: "Se solicitó engrane ENG-M22-03 a proveedor. ETA: 3-5 días.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Historial simple para las demás órdenes
  for (const orden of [orden3, orden4, orden5, orden6]) {
    await prisma.historialEstado.create({
      data: {
        ordenId: orden.id,
        estadoAnterior: null,
        estadoNuevo: EstadoOrden.RECIBIDO,
        usuarioId: orden.creadoPorId,
        notas: "Orden creada",
        createdAt: orden.fechaRecepcion,
      },
    });
  }

  console.log("📜 Historial de estados creado");

  // =============== MATERIALES USADOS ===============

  // Materiales usados en orden 1
  await prisma.materialUsado.create({
    data: {
      ordenId: orden1.id,
      materialId: materiales[3].id, // Batería
      cantidad: 1,
      precioUnitario: 350,
    },
  });

  // Materiales usados en orden 4
  await prisma.materialUsado.create({
    data: {
      ordenId: orden4.id,
      materialId: materiales[0].id, // Celda de carga
      cantidad: 1,
      precioUnitario: 850,
    },
  });

  console.log("🔧 Materiales usados registrados");

  console.log("\n✅ Seed completado exitosamente!");
  console.log("\n📧 Usuarios de prueba:");
  console.log("   admin@marmaq.mx / marmaq2024 (Super Admin)");
  console.log("   ricardo@marmaq.mx / marmaq2024 (Coord. Servicio)");
  console.log("   benito@marmaq.mx / marmaq2024 (Técnico)");
  console.log("   carlos@marmaq.mx / marmaq2024 (Técnico)");
  console.log("\n📋 Órdenes de prueba:");
  console.log("   OS-2024-0001: GARANTÍA - LISTO_ENTREGA (🔴 Rojo - más de 5 días)");
  console.log("   OS-2024-0002: CENTRO_SERVICIO - ESPERA_REFACCIONES (🟠 Naranja)");
  console.log("   OS-2024-0003: POR_COBRAR - EN_DIAGNOSTICO (🟡 Amarillo - más de 72h)");
  console.log("   OS-2024-0004: GARANTÍA - EN_REPARACION (🟢 Verde)");
  console.log("   OS-2024-0005: REPARE - RECIBIDO (🔵 Azul - recibido hoy)");
  console.log("   OS-2024-0006: POR_COBRAR - COTIZACION_PENDIENTE (🟡 Amarillo)");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
