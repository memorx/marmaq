/**
 * Generador de reportes TORREY para garantías de básculas
 * Formato basado en "NOVIEMBRE ' 2025.xlsx"
 */
import ExcelJS from "exceljs";
import { Orden, Cliente, User, Evidencia } from "@prisma/client";

type OrdenConRelaciones = Orden & {
  cliente: Cliente;
  tecnico: User | null;
  evidencias: Evidencia[];
};


export async function generateTorreyReport(
  ordenes: OrdenConRelaciones[],
  mes: number,
  año: number
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MARMAQ Servicios";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("REPORTE DE SERVICIO", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  // Configurar anchos de columna
  worksheet.columns = [
    { width: 14 }, // A
    { width: 14 }, // B
    { width: 14 }, // C
    { width: 14 }, // D
    { width: 14 }, // E
    { width: 14 }, // F
    { width: 14 }, // G
    { width: 14 }, // H
  ];

  let currentRow = 1;

  // Generar un bloque por cada orden
  for (let i = 0; i < ordenes.length; i++) {
    const orden = ordenes[i];

    // === TÍTULO ===
    worksheet.mergeCells(currentRow, 1, currentRow + 4, 8);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = "REPORTE DE SERVICIO EN GARANTÍA DE BÁSCULAS";
    titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1F4E79" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow += 5;

    // === FECHAS Y NÚMERO DE REPORTE ===
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    worksheet.getCell(currentRow, 1).value = ` FECHA DE RECIBO: ${formatDate(orden.fechaRecepcion)}`;

    worksheet.mergeCells(currentRow, 4, currentRow, 6);
    worksheet.getCell(currentRow, 4).value = ` FECHA DE ENTREGA: ${orden.fechaEntrega ? formatDate(orden.fechaEntrega) : "PENDIENTE"}`;

    worksheet.mergeCells(currentRow, 7, currentRow, 8);
    worksheet.getCell(currentRow, 7).value = ` No. DE REPORTE: ${i + 1}`;

    applyHeaderStyle(worksheet, currentRow, 1, 8);
    currentRow++;

    // === DATOS DE CLIENTE ===
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    const clienteHeader = worksheet.getCell(currentRow, 1);
    clienteHeader.value = "DATOS DE CLIENTE (DISTRIBUIDOR)";
    clienteHeader.font = { bold: true, size: 11 };
    clienteHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E2F3" } };
    currentRow++;

    // Nombre
    worksheet.getCell(currentRow, 1).value = " NOMBRE:";
    worksheet.mergeCells(currentRow, 2, currentRow, 7);
    worksheet.getCell(currentRow, 2).value = orden.cliente.nombre;
    currentRow++;

    // Empresa
    worksheet.getCell(currentRow, 1).value = " EMPRESA:";
    worksheet.mergeCells(currentRow, 2, currentRow, 7);
    worksheet.getCell(currentRow, 2).value = orden.cliente.empresa || "";
    currentRow++;

    // Dirección
    worksheet.getCell(currentRow, 1).value = " DIRECCIÓN:";
    worksheet.mergeCells(currentRow, 2, currentRow, 7);
    worksheet.getCell(currentRow, 2).value = `${orden.cliente.direccion || ""} ${orden.cliente.ciudad || ""}`;
    currentRow++;

    // Teléfono
    worksheet.getCell(currentRow, 1).value = " TELÉFONO:";
    worksheet.mergeCells(currentRow, 2, currentRow, 3);
    worksheet.getCell(currentRow, 2).value = orden.cliente.telefono;
    worksheet.getCell(currentRow, 4).value = "CELULAR:";
    worksheet.mergeCells(currentRow, 5, currentRow, 6);
    worksheet.getCell(currentRow, 5).value = "";
    currentRow++;

    // Correo
    worksheet.getCell(currentRow, 1).value = " CORREO:";
    worksheet.mergeCells(currentRow, 2, currentRow, 5);
    worksheet.getCell(currentRow, 2).value = orden.cliente.email || "";
    currentRow++;

    currentRow++; // Espacio

    // === DATOS DE EQUIPO ===
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    const equipoHeader = worksheet.getCell(currentRow, 1);
    equipoHeader.value = "DATOS DE EQUIPO";
    equipoHeader.font = { bold: true, size: 11 };
    equipoHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E2F3" } };
    currentRow++;

    // Headers equipo
    worksheet.mergeCells(currentRow, 1, currentRow, 2);
    worksheet.getCell(currentRow, 1).value = "MODELO";
    worksheet.getCell(currentRow, 1).font = { bold: true };

    worksheet.mergeCells(currentRow, 3, currentRow, 4);
    worksheet.getCell(currentRow, 3).value = "SERIE";
    worksheet.getCell(currentRow, 3).font = { bold: true };

    worksheet.mergeCells(currentRow, 5, currentRow, 8);
    worksheet.getCell(currentRow, 5).value = "ACCESORIOS";
    worksheet.getCell(currentRow, 5).font = { bold: true };
    currentRow++;

    // Valores equipo
    worksheet.mergeCells(currentRow, 1, currentRow + 2, 2);
    worksheet.getCell(currentRow, 1).value = orden.modeloEquipo;
    worksheet.getCell(currentRow, 1).alignment = { vertical: "middle", horizontal: "center" };

    worksheet.mergeCells(currentRow, 3, currentRow + 2, 4);
    worksheet.getCell(currentRow, 3).value = orden.serieEquipo || "N/A";
    worksheet.getCell(currentRow, 3).alignment = { vertical: "middle", horizontal: "center" };

    // Accesorios (checkboxes)
    const accesorios = orden.accesorios as Record<string, boolean> | null;
    const accesoriosList = [
      ["PLATO", "ELIMINADOR", "ANTENA", "CANDADO"],
      ["MÓDULO", "TORRETA", "PORTAPLATO", "CAJA ORIGINAL"],
      ["CABLE A/C", "OTROS:", "", ""],
    ];

    for (let accRow = 0; accRow < 3; accRow++) {
      for (let accCol = 0; accCol < 4; accCol++) {
        const accName = accesoriosList[accRow][accCol];
        if (accName && accName !== "OTROS:") {
          const key = accName.toLowerCase().replace(/\s/g, "").replace("/", "");
          const hasAcc = accesorios?.[key] ?? false;
          worksheet.getCell(currentRow + accRow, 5 + accCol).value = `${hasAcc ? "☑" : "☐"} ${accName}`;
        } else if (accName === "OTROS:") {
          worksheet.getCell(currentRow + accRow, 5 + accCol).value = accName;
        }
      }
    }
    currentRow += 3;

    // === CONDICIONES DEL EQUIPO ===
    worksheet.mergeCells(currentRow, 1, currentRow, 2);
    worksheet.getCell(currentRow, 1).value = "CONDICIONES DEL EQUIPO";
    worksheet.getCell(currentRow, 1).font = { bold: true };
    currentRow++;

    const condiciones = ["BUENAS", "REGULARES", "MALAS"];
    for (let i = 0; i < 3; i++) {
      const isSelected = orden.condicionEquipo === condiciones[i].replace("S", "").toUpperCase() ||
                        (orden.condicionEquipo === "BUENA" && condiciones[i] === "BUENAS") ||
                        (orden.condicionEquipo === "REGULAR" && condiciones[i] === "REGULARES") ||
                        (orden.condicionEquipo === "MALA" && condiciones[i] === "MALAS");
      worksheet.getCell(currentRow, 1 + i * 2).value = `${isSelected ? "●" : "○"} ${condiciones[i]}`;
    }
    currentRow += 2;

    // === ANÁLISIS DEL EQUIPO ===
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    const analisisHeader = worksheet.getCell(currentRow, 1);
    analisisHeader.value = "ANÁLISIS DEL EQUIPO";
    analisisHeader.font = { bold: true, size: 11 };
    analisisHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E2F3" } };
    currentRow++;

    currentRow++; // Espacio

    // Falla reportada
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    worksheet.getCell(currentRow, 1).value = "FALLA REPORTADA";
    worksheet.getCell(currentRow, 1).font = { bold: true };
    currentRow++;

    worksheet.mergeCells(currentRow, 1, currentRow + 1, 8);
    worksheet.getCell(currentRow, 1).value = orden.fallaReportada;
    worksheet.getCell(currentRow, 1).alignment = { wrapText: true, vertical: "top" };
    currentRow += 2;

    // Falla presentada detallada
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    worksheet.getCell(currentRow, 1).value = "FALLA PRESENTADA DETALLADA";
    worksheet.getCell(currentRow, 1).font = { bold: true };
    currentRow++;

    worksheet.mergeCells(currentRow, 1, currentRow + 4, 8);
    worksheet.getCell(currentRow, 1).value = orden.diagnostico || "";
    worksheet.getCell(currentRow, 1).alignment = { wrapText: true, vertical: "top" };
    applyBorder(worksheet, currentRow, 1, currentRow + 4, 8);
    currentRow += 5;

    // Causa de la falla
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    worksheet.getCell(currentRow, 1).value = "CAUSA DE LA FALLA";
    worksheet.getCell(currentRow, 1).font = { bold: true };
    currentRow++;

    worksheet.mergeCells(currentRow, 1, currentRow + 4, 8);
    worksheet.getCell(currentRow, 1).value = ""; // Se deja vacío para que el técnico lo llene
    applyBorder(worksheet, currentRow, 1, currentRow + 4, 8);
    currentRow += 5;

    // Solución a la falla
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    worksheet.getCell(currentRow, 1).value = "SOLUCIÓN A LA FALLA";
    worksheet.getCell(currentRow, 1).font = { bold: true };
    currentRow++;

    worksheet.mergeCells(currentRow, 1, currentRow + 4, 8);
    worksheet.getCell(currentRow, 1).value = orden.notasTecnico || "";
    worksheet.getCell(currentRow, 1).alignment = { wrapText: true, vertical: "top" };
    applyBorder(worksheet, currentRow, 1, currentRow + 4, 8);
    currentRow += 5;

    // === TIPO DE SERVICIO Y PIEZAS ===
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    worksheet.getCell(currentRow, 1).value = "TIPO DE SERVICIO REALIZADO";
    worksheet.getCell(currentRow, 1).font = { bold: true };

    worksheet.mergeCells(currentRow, 5, currentRow, 8);
    worksheet.getCell(currentRow, 5).value = "PIEZAS REEMPLAZADAS";
    worksheet.getCell(currentRow, 5).font = { bold: true };
    currentRow++;

    // Opciones de servicio
    const servicios = ["GARANTÍA", "FUERA DE GARANTÍA", "CORTESÍA"];
    for (const serv of servicios) {
      const isGarantia = serv === "GARANTÍA" && orden.tipoServicio === "GARANTIA";
      worksheet.getCell(currentRow, 1).value = `${isGarantia ? "●" : "○"} ${serv}`;
      currentRow++;
    }

    // Agregar espacio para fotos si hay evidencias
    if (orden.evidencias.length > 0) {
      currentRow += 2;
      worksheet.mergeCells(currentRow, 1, currentRow, 8);
      worksheet.getCell(currentRow, 1).value = `📷 EVIDENCIAS FOTOGRÁFICAS: ${orden.evidencias.length} imagen(es)`;
      worksheet.getCell(currentRow, 1).font = { bold: true, italic: true };
      currentRow++;

      for (const evidencia of orden.evidencias.slice(0, 4)) { // Máximo 4 evidencias
        worksheet.getCell(currentRow, 1).value = `• ${evidencia.tipo}: ${evidencia.url}`;
        worksheet.getCell(currentRow, 1).font = { size: 9, color: { argb: "0066CC" } };
        currentRow++;
      }
    }

    // Agregar salto de página después de cada reporte (excepto el último)
    if (i < ordenes.length - 1) {
      currentRow += 5;
      worksheet.getRow(currentRow).addPageBreak();
      currentRow++;
    }
  }

  // Si no hay órdenes, mostrar mensaje
  if (ordenes.length === 0) {
    worksheet.mergeCells(1, 1, 1, 8);
    worksheet.getCell(1, 1).value = `No hay órdenes de garantía para ${getMonthName(mes)} ${año}`;
    worksheet.getCell(1, 1).font = { size: 14, italic: true };
    worksheet.getCell(1, 1).alignment = { horizontal: "center" };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getMonthName(month: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return months[month - 1] || "";
}

function applyHeaderStyle(worksheet: ExcelJS.Worksheet, row: number, startCol: number, endCol: number) {
  for (let col = startCol; col <= endCol; col++) {
    const cell = worksheet.getCell(row, col);
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E7E6E6" } };
  }
}

function applyBorder(worksheet: ExcelJS.Worksheet, startRow: number, startCol: number, endRow: number, endCol: number) {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cell = worksheet.getCell(row, col);
      cell.border = {
        top: { style: "thin", color: { argb: "CCCCCC" } },
        left: { style: "thin", color: { argb: "CCCCCC" } },
        bottom: { style: "thin", color: { argb: "CCCCCC" } },
        right: { style: "thin", color: { argb: "CCCCCC" } },
      };
    }
  }
}
