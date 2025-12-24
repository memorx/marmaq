/**
 * Script de prueba para generadores de reportes TORREY y REPARE
 * Genera archivos Excel reales para verificar el formato
 *
 * Uso: npx tsx scripts/test-reportes.ts
 */

import { generateTorreyReport } from "../src/lib/reportes/torrey-generator";
import { generateRepareReport } from "../src/lib/reportes/repare-generator";
import { TipoServicio, EstadoOrden, Prioridad, CondicionEquipo } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Colores para consola
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

// Datos de prueba basados en el seed
const mockClientes = [
  {
    id: "cliente-1",
    nombre: "Juan Pérez",
    empresa: "Carnicería El Toro",
    telefono: "33 1234 5678",
    email: "contacto@carniceriaeltoro.com",
    direccion: "Av. Revolución 123",
    ciudad: "Guadalajara",
    esDistribuidor: false,
    codigoDistribuidor: null,
    notas: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "cliente-2",
    nombre: "María García",
    empresa: "Gastroequipos GDL",
    telefono: "33 9876 5432",
    email: "ventas@gastroequiposgdl.com",
    direccion: "Calz. del Federalismo 456",
    ciudad: "Guadalajara",
    esDistribuidor: true,
    codigoDistribuidor: "DIST-001",
    notas: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "cliente-3",
    nombre: "Carmen Ruiz",
    empresa: "Cremería Lupita",
    telefono: "33 4567 8901",
    email: "cremeria.lupita@gmail.com",
    direccion: "Mercado San Juan de Dios Local 42",
    ciudad: "Guadalajara",
    esDistribuidor: false,
    codigoDistribuidor: null,
    notas: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "cliente-4",
    nombre: "Ana López",
    empresa: "Restaurante La Patrona",
    telefono: "33 3456 7890",
    email: "reservaciones@lapatrona.mx",
    direccion: "Av. Vallarta 1010",
    ciudad: "Guadalajara",
    esDistribuidor: false,
    codigoDistribuidor: null,
    notas: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockTecnico = {
  id: "tecnico-1",
  email: "benito@marmaq.mx",
  name: "Benito García",
  password: "hashed",
  role: "TECNICO" as const,
  activo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Órdenes de GARANTÍA para reporte TORREY
const ordenesGarantia = [
  {
    id: "orden-1",
    folio: "OS-2024-0001",
    tipoServicio: TipoServicio.GARANTIA,
    estado: EstadoOrden.LISTO_ENTREGA,
    prioridad: Prioridad.ALTA,
    clienteId: "cliente-1",
    cliente: mockClientes[0],
    tecnicoId: "tecnico-1",
    tecnico: mockTecnico,
    creadoPorId: "admin-1",
    marcaEquipo: "Torrey",
    modeloEquipo: "L-EQ 10/20",
    serieEquipo: "LEQ-2024-001234",
    accesorios: { plato: true, eliminador: true, antena: false, candado: true, modulo: false },
    condicionEquipo: CondicionEquipo.REGULAR,
    fallaReportada: "No enciende, cliente reporta que dejó de funcionar después de una descarga eléctrica",
    diagnostico: "Fuente de poder dañada por sobrecarga eléctrica. Se detectó quemadura en capacitor principal.",
    notasTecnico: "Se reemplazó fuente de poder completa. Equipo funcionando correctamente. Se recomienda usar regulador de voltaje.",
    numeroFactura: "FAC-2024-5678",
    fechaFactura: new Date("2024-06-15"),
    fechaRecepcion: new Date("2024-11-01"),
    fechaReparacion: new Date("2024-11-05"),
    fechaEntrega: new Date("2024-11-06"),
    numeroRepare: null,
    coordenadasGPS: null,
    cotizacion: null,
    cotizacionAprobada: null,
    fechaCotizacion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    evidencias: [
      {
        id: "ev-1",
        ordenId: "orden-1",
        tipo: "ANTES",
        url: "https://storage.example.com/evidencias/antes-1.jpg",
        descripcion: "Equipo al momento de recepción",
        createdAt: new Date(),
      },
    ],
  },
  {
    id: "orden-2",
    folio: "OS-2024-0004",
    tipoServicio: TipoServicio.GARANTIA,
    estado: EstadoOrden.EN_REPARACION,
    prioridad: Prioridad.ALTA,
    clienteId: "cliente-4",
    cliente: mockClientes[3],
    tecnicoId: "tecnico-1",
    tecnico: mockTecnico,
    creadoPorId: "admin-1",
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
    fechaRecepcion: new Date("2024-11-10"),
    fechaReparacion: null,
    fechaEntrega: null,
    numeroRepare: null,
    coordenadasGPS: null,
    cotizacion: null,
    cotizacionAprobada: null,
    fechaCotizacion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    evidencias: [],
  },
  {
    id: "orden-3",
    folio: "OS-2024-0002",
    tipoServicio: TipoServicio.CENTRO_SERVICIO,
    estado: EstadoOrden.ESPERA_REFACCIONES,
    prioridad: Prioridad.NORMAL,
    clienteId: "cliente-2",
    cliente: mockClientes[1],
    tecnicoId: "tecnico-1",
    tecnico: mockTecnico,
    creadoPorId: "admin-1",
    marcaEquipo: "Torrey",
    modeloEquipo: "M-22 R2",
    serieEquipo: "M22-2023-009876",
    accesorios: null,
    condicionEquipo: CondicionEquipo.MALA,
    fallaReportada: "Engrane roto, hace ruido metálico fuerte al moler. Cliente indica que trabaja desde hace 5 años sin mantenimiento.",
    diagnostico: "Engrane principal con dientes rotos. Cojinete del eje presenta desgaste.",
    notasTecnico: "Equipo muy maltratado. Se solicitó refacción ENG-M22-03 a almacén.",
    numeroFactura: null,
    fechaFactura: null,
    fechaRecepcion: new Date("2024-11-05"),
    fechaReparacion: null,
    fechaEntrega: null,
    numeroRepare: null,
    coordenadasGPS: null,
    cotizacion: null,
    cotizacionAprobada: null,
    fechaCotizacion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    evidencias: [],
  },
];

// Órdenes REPARE para reporte REPARE
const ordenesRepare = [
  {
    id: "orden-5",
    folio: "OS-2024-0005",
    tipoServicio: TipoServicio.REPARE,
    estado: EstadoOrden.RECIBIDO,
    prioridad: Prioridad.URGENTE,
    clienteId: "cliente-3",
    cliente: mockClientes[2],
    tecnicoId: null,
    tecnico: null,
    creadoPorId: "admin-1",
    marcaEquipo: "Imbera",
    modeloEquipo: "VR-17",
    serieEquipo: "VR17-2023-112233",
    accesorios: null,
    condicionEquipo: CondicionEquipo.MALA,
    fallaReportada: "Refrigerador no enfría, compresor no arranca. Producto en riesgo de echarse a perder.",
    diagnostico: null,
    notasTecnico: null,
    numeroFactura: null,
    fechaFactura: null,
    fechaRecepcion: new Date("2024-11-15"),
    fechaReparacion: null,
    fechaEntrega: null,
    numeroRepare: "REP-2024-1234",
    coordenadasGPS: "20.6597,-103.3496",
    cotizacion: null,
    cotizacionAprobada: null,
    fechaCotizacion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "orden-6",
    folio: "OS-2024-0007",
    tipoServicio: TipoServicio.REPARE,
    estado: EstadoOrden.EN_DIAGNOSTICO,
    prioridad: Prioridad.ALTA,
    clienteId: "cliente-1",
    cliente: mockClientes[0],
    tecnicoId: "tecnico-1",
    tecnico: mockTecnico,
    creadoPorId: "admin-1",
    marcaEquipo: "Imbera",
    modeloEquipo: "VR-25",
    serieEquipo: "VR25-2024-554433",
    accesorios: null,
    condicionEquipo: CondicionEquipo.REGULAR,
    fallaReportada: "Refrigerador hace ruido excesivo y no mantiene temperatura.",
    diagnostico: "Ventilador del evaporador con rodamiento dañado.",
    notasTecnico: "Se requiere cambio de ventilador. Parte disponible en almacén.",
    numeroFactura: null,
    fechaFactura: new Date("2024-09-01"),
    fechaRecepcion: new Date("2024-11-18"),
    fechaReparacion: null,
    fechaEntrega: null,
    numeroRepare: "REP-2024-1235",
    coordenadasGPS: "20.6739,-103.3479",
    cotizacion: null,
    cotizacionAprobada: null,
    fechaCotizacion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function testReportes() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}   TEST DE GENERADORES DE REPORTES MARMAQ${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════════════════${RESET}\n`);

  const outputDir = path.join(process.cwd(), "test-output");

  // Crear directorio de salida si no existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`${YELLOW}📁 Directorio de salida creado: ${outputDir}${RESET}\n`);
  }

  let passed = 0;
  let failed = 0;

  // Test 1: Generar reporte TORREY
  console.log(`${BLUE}[1/4] Generando reporte TORREY con ${ordenesGarantia.length} órdenes...${RESET}`);
  try {
    const startTime = Date.now();
    const bufferTorrey = await generateTorreyReport(ordenesGarantia, 11, 2024);
    const elapsed = Date.now() - startTime;

    const torreyPath = path.join(outputDir, "Reporte_TORREY_Noviembre_2024.xlsx");
    fs.writeFileSync(torreyPath, bufferTorrey);

    console.log(`   ${GREEN}✓ Reporte TORREY generado exitosamente${RESET}`);
    console.log(`     - Tamaño: ${(bufferTorrey.length / 1024).toFixed(2)} KB`);
    console.log(`     - Tiempo: ${elapsed}ms`);
    console.log(`     - Archivo: ${torreyPath}`);
    passed++;
  } catch (error) {
    console.log(`   ${RED}✗ Error generando reporte TORREY: ${error}${RESET}`);
    failed++;
  }

  // Test 2: Generar reporte REPARE
  console.log(`\n${BLUE}[2/4] Generando reporte REPARE con ${ordenesRepare.length} órdenes...${RESET}`);
  try {
    const startTime = Date.now();
    const bufferRepare = await generateRepareReport(ordenesRepare, 11, 2024);
    const elapsed = Date.now() - startTime;

    const reparePath = path.join(outputDir, "LayOut_REPARE_Noviembre_2024.xlsx");
    fs.writeFileSync(reparePath, bufferRepare);

    console.log(`   ${GREEN}✓ Reporte REPARE generado exitosamente${RESET}`);
    console.log(`     - Tamaño: ${(bufferRepare.length / 1024).toFixed(2)} KB`);
    console.log(`     - Tiempo: ${elapsed}ms`);
    console.log(`     - Archivo: ${reparePath}`);
    passed++;
  } catch (error) {
    console.log(`   ${RED}✗ Error generando reporte REPARE: ${error}${RESET}`);
    failed++;
  }

  // Test 3: Generar reporte TORREY vacío
  console.log(`\n${BLUE}[3/4] Generando reporte TORREY sin órdenes (caso vacío)...${RESET}`);
  try {
    const startTime = Date.now();
    const bufferEmpty = await generateTorreyReport([], 12, 2024);
    const elapsed = Date.now() - startTime;

    const emptyPath = path.join(outputDir, "Reporte_TORREY_Diciembre_2024_VACIO.xlsx");
    fs.writeFileSync(emptyPath, bufferEmpty);

    console.log(`   ${GREEN}✓ Reporte vacío generado exitosamente${RESET}`);
    console.log(`     - Tamaño: ${(bufferEmpty.length / 1024).toFixed(2)} KB`);
    console.log(`     - Tiempo: ${elapsed}ms`);
    console.log(`     - Archivo: ${emptyPath}`);
    passed++;
  } catch (error) {
    console.log(`   ${RED}✗ Error generando reporte vacío: ${error}${RESET}`);
    failed++;
  }

  // Test 4: Generar reporte REPARE vacío
  console.log(`\n${BLUE}[4/4] Generando reporte REPARE sin órdenes (caso vacío)...${RESET}`);
  try {
    const startTime = Date.now();
    const bufferEmpty = await generateRepareReport([], 12, 2024);
    const elapsed = Date.now() - startTime;

    const emptyPath = path.join(outputDir, "LayOut_REPARE_Diciembre_2024_VACIO.xlsx");
    fs.writeFileSync(emptyPath, bufferEmpty);

    console.log(`   ${GREEN}✓ Reporte vacío generado exitosamente${RESET}`);
    console.log(`     - Tamaño: ${(bufferEmpty.length / 1024).toFixed(2)} KB`);
    console.log(`     - Tiempo: ${elapsed}ms`);
    console.log(`     - Archivo: ${emptyPath}`);
    passed++;
  } catch (error) {
    console.log(`   ${RED}✗ Error generando reporte vacío: ${error}${RESET}`);
    failed++;
  }

  // Resumen
  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}   RESUMEN DE PRUEBAS${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`   ${GREEN}✓ Pasadas: ${passed}${RESET}`);
  if (failed > 0) {
    console.log(`   ${RED}✗ Fallidas: ${failed}${RESET}`);
  }
  console.log(`\n   📂 Archivos generados en: ${outputDir}`);
  console.log(`   📋 Puedes abrir los archivos Excel para verificar el formato.\n`);

  // Listar archivos generados
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith(".xlsx"));
  if (files.length > 0) {
    console.log(`   Archivos disponibles:`);
    files.forEach(file => {
      const stats = fs.statSync(path.join(outputDir, file));
      console.log(`     - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
  }

  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════════${RESET}\n`);

  return failed === 0;
}

// Ejecutar
testReportes()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error(`${RED}Error fatal:${RESET}`, error);
    process.exit(1);
  });
