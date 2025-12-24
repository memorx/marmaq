/**
 * Generador de reportes REPARE para refrigeración
 * Formato basado en "F. Lay Out Repare 2025.xlsx"
 */
import ExcelJS from "exceljs";
import { Orden, Cliente, User } from "@prisma/client";

type OrdenConRelaciones = Orden & {
  cliente: Cliente;
  tecnico: User | null;
};

// Columnas del formato REPARE
const REPARE_COLUMNS = [
  { header: "Modelo", key: "modelo", width: 18 },
  { header: "Serie", key: "serie", width: 20 },
  { header: "Falla Reportada & NOTAS", key: "falla", width: 35 },
  { header: "Hora Atención", key: "horaAtencion", width: 18 },
  { header: "Fecha Factura", key: "fechaFactura", width: 15 },
  { header: "Num. De Distribuidor", key: "numDistribuidor", width: 18 },
  { header: "N° de Cliente", key: "numCliente", width: 15 },
  { header: "Nombre punto de venta", key: "nombrePV", width: 25 },
  { header: "Calle", key: "calle", width: 20 },
  { header: "Número", key: "numero", width: 10 },
  { header: "Entre calle", key: "entreCalle1", width: 15 },
  { header: "y calle", key: "entreCalle2", width: 15 },
  { header: "Colonia", key: "colonia", width: 18 },
  { header: "Municipio", key: "municipio", width: 18 },
  { header: "Código Postal", key: "cp", width: 12 },
  { header: "Latitud", key: "latitud", width: 20 },
  { header: "Longitud(-)", key: "longitud", width: 20 },
  { header: "Telefono y/o fax", key: "telefono", width: 18 },
  { header: "Teléfono adicional", key: "telefonoAdicional", width: 18 },
  { header: "Correo electrónico", key: "correo", width: 25 },
  { header: "Nombre contacto punto de venta", key: "nombreContacto", width: 25 },
  { header: "TIPO DE MOVIMIENTO", key: "tipoMovimiento", width: 18 },
  { header: "CANAL", key: "canal", width: 12 },
  { header: "REGIÓN", key: "region", width: 12 },
  { header: "SUCURSAL", key: "sucursal", width: 15 },
];

export async function generateRepareReport(
  ordenes: OrdenConRelaciones[],
  mes: number,
  año: number
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MARMAQ Servicios";
  workbook.created = new Date();

  // Hoja principal: RUTA
  const rutaSheet = workbook.addWorksheet("RUTA", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
    },
  });

  // Configurar columnas
  rutaSheet.columns = REPARE_COLUMNS.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Estilo del header
  const headerRow = rutaSheet.getRow(1);
  headerRow.font = { bold: true, size: 10, color: { argb: "FFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1F4E79" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 30;

  // Fila de instrucciones (fila 2)
  const instructionRow = rutaSheet.getRow(2);
  const instructions = [
    "(MODELO COMERCIAL DEL EQUIPO)",
    "(SERIE COMPLETA)",
    "(BREVE EXPLICACION DE LA FALLA)",
    "FORMATO 24HRS",
    "MES // AÑO",
    "NO. DE DISTRIBUIDOR",
    "NO LLENAR",
    "(NOMBRE DEL NEGOCIO)",
    "(NOMBRE DE LA CALLE)",
    "(NUMERO)",
    "(NOMBRE DE LA CALLE)",
    "(NOMBRE DE LA CALLE)",
    "(NOMBRE DE LA COLONIA)",
    "(MUNICIPIO/ESTADO)",
    "(CP)",
    "",
    "",
    "(NO. CELULAR)",
    "(NO. ADICIONAL)",
    "",
    "",
    "",
    "",
    "",
    "",
  ];

  instructions.forEach((inst, i) => {
    const cell = instructionRow.getCell(i + 1);
    cell.value = inst;
    cell.font = { size: 8, italic: true, color: { argb: "666666" } };
    cell.alignment = { wrapText: true };
  });
  instructionRow.height = 40;

  // Agregar datos de órdenes
  let rowIndex = 3;
  for (const orden of ordenes) {
    // Parsear coordenadas GPS si existen
    let latitud = "";
    let longitud = "";
    if (orden.coordenadasGPS) {
      const coords = orden.coordenadasGPS.split(",");
      if (coords.length >= 2) {
        latitud = coords[0].trim();
        longitud = coords[1].trim();
      }
    }

    // Parsear dirección (simplificado)
    const direccionParts = parseDireccion(orden.cliente.direccion || "");

    const row = rutaSheet.getRow(rowIndex);
    row.values = {
      modelo: orden.modeloEquipo,
      serie: orden.serieEquipo || "",
      falla: `${orden.fallaReportada}${orden.notasTecnico ? ` | NOTAS: ${orden.notasTecnico}` : ""}`,
      horaAtencion: "8:00 a 14:00 HRS", // Default
      fechaFactura: orden.fechaFactura ? formatDateRepare(orden.fechaFactura) : "",
      numDistribuidor: orden.cliente.codigoDistribuidor || "",
      numCliente: "", // Se deja vacío según instrucciones
      nombrePV: orden.cliente.empresa || orden.cliente.nombre,
      calle: direccionParts.calle,
      numero: direccionParts.numero,
      entreCalle1: "",
      entreCalle2: "",
      colonia: direccionParts.colonia,
      municipio: orden.cliente.ciudad || "",
      cp: direccionParts.cp,
      latitud: latitud,
      longitud: longitud,
      telefono: orden.cliente.telefono,
      telefonoAdicional: "",
      correo: orden.cliente.email || "",
      nombreContacto: orden.cliente.nombre,
      tipoMovimiento: "GARANTIA",
      canal: "",
      region: "OCCIDENTE", // Default para GDL
      sucursal: "MARMAQ",
    };

    // Estilo de la fila de datos
    row.font = { size: 10 };
    row.alignment = { vertical: "middle", wrapText: true };
    row.height = 25;

    // Alternar colores de fondo
    if (rowIndex % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
    }

    rowIndex++;
  }

  // Agregar bordes a todas las celdas con datos
  for (let r = 1; r <= rowIndex - 1; r++) {
    for (let c = 1; c <= REPARE_COLUMNS.length; c++) {
      const cell = rutaSheet.getCell(r, c);
      cell.border = {
        top: { style: "thin", color: { argb: "CCCCCC" } },
        left: { style: "thin", color: { argb: "CCCCCC" } },
        bottom: { style: "thin", color: { argb: "CCCCCC" } },
        right: { style: "thin", color: { argb: "CCCCCC" } },
      };
    }
  }

  // Si no hay órdenes
  if (ordenes.length === 0) {
    const emptyRow = rutaSheet.getRow(3);
    rutaSheet.mergeCells(3, 1, 3, 10);
    emptyRow.getCell(1).value = `No hay órdenes REPARE para ${getMonthName(mes)} ${año}`;
    emptyRow.getCell(1).font = { italic: true, size: 12 };
    emptyRow.getCell(1).alignment = { horizontal: "center" };
  }

  // Agregar hoja resumen
  const resumenSheet = workbook.addWorksheet("RESUMEN");
  resumenSheet.columns = [
    { header: "Concepto", key: "concepto", width: 30 },
    { header: "Valor", key: "valor", width: 25 },
  ];

  resumenSheet.addRows([
    { concepto: "Período", valor: `${getMonthName(mes)} ${año}` },
    { concepto: "Total de órdenes", valor: ordenes.length },
    { concepto: "Generado el", valor: new Date().toLocaleString("es-MX") },
    { concepto: "Generado por", valor: "Sistema MARMAQ Servicios" },
  ]);

  // Estilo del resumen
  resumenSheet.getRow(1).font = { bold: true };
  resumenSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E2F3" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function formatDateRepare(date: Date): string {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getMonthName(month: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return months[month - 1] || "";
}

interface DireccionParts {
  calle: string;
  numero: string;
  colonia: string;
  cp: string;
}

function parseDireccion(direccion: string): DireccionParts {
  // Intentar extraer partes de la dirección
  // Formato típico: "Calle Nombre #123, Colonia Nombre, CP 12345"
  const result: DireccionParts = {
    calle: direccion,
    numero: "",
    colonia: "",
    cp: "",
  };

  // Buscar número
  const numMatch = direccion.match(/#?\s*(\d+)/);
  if (numMatch) {
    result.numero = numMatch[1];
    result.calle = direccion.substring(0, numMatch.index).trim();
  }

  // Buscar código postal
  const cpMatch = direccion.match(/\b(\d{5})\b/);
  if (cpMatch) {
    result.cp = cpMatch[1];
  }

  // Buscar colonia (después de coma o "Col.")
  const coloniaMatch = direccion.match(/(?:Col\.?|Colonia)\s*([^,]+)/i);
  if (coloniaMatch) {
    result.colonia = coloniaMatch[1].trim();
  }

  return result;
}
