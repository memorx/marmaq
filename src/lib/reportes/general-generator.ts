import ExcelJS from "exceljs";
import { Orden, Cliente, User, Evidencia } from "@prisma/client";

type OrdenConRelaciones = Orden & {
  cliente: Cliente;
  tecnico: User | null;
  evidencias: Evidencia[];
};

export async function generateGeneralReport(
  ordenes: OrdenConRelaciones[],
  mes: number,
  año: number
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Reporte General");

  // Header MARMAQ
  sheet.mergeCells("A1:L1");
  const headerCell = sheet.getCell("A1");
  headerCell.value = "MARMAQ MEXICALTZINGO - Reporte General de Servicios";
  headerCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF092139" } };
  headerCell.alignment = { horizontal: "center" };

  sheet.mergeCells("A2:L2");
  const subHeader = sheet.getCell("A2");
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  subHeader.value = `${meses[mes - 1]} ${año} — Órdenes Entregadas`;
  subHeader.font = { name: "Arial", size: 11, color: { argb: "FF31A7D4" } };
  subHeader.alignment = { horizontal: "center" };

  // Columnas
  const columns = [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Fecha Recepción", key: "fechaRecepcion", width: 14 },
    { header: "Fecha Entrega", key: "fechaEntrega", width: 14 },
    { header: "Cliente", key: "cliente", width: 25 },
    { header: "Empresa", key: "empresa", width: 20 },
    { header: "Equipo", key: "equipo", width: 25 },
    { header: "Serie", key: "serie", width: 18 },
    { header: "Tipo Servicio", key: "tipoServicio", width: 16 },
    { header: "Técnico", key: "tecnico", width: 20 },
    { header: "Falla Reportada", key: "falla", width: 30 },
    { header: "Diagnóstico", key: "diagnostico", width: 30 },
    { header: "Cotización", key: "cotizacion", width: 14 },
  ];

  // Fila de headers (fila 4)
  const headerRow = sheet.getRow(4);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF092139" } };
    cell.alignment = { horizontal: "center", wrapText: true };
    sheet.getColumn(i + 1).width = col.width;
  });

  // Map labels
  const tipoLabels: Record<string, string> = {
    GARANTIA: "Garantía",
    CENTRO_SERVICIO: "Centro Servicio",
    POR_COBRAR: "Por Cobrar",
    REPARE: "REPARE",
  };

  // Datos
  ordenes.forEach((orden, idx) => {
    const row = sheet.getRow(5 + idx);
    const values = [
      orden.folio,
      orden.fechaRecepcion ? new Date(orden.fechaRecepcion).toLocaleDateString("es-MX") : "-",
      orden.fechaEntrega ? new Date(orden.fechaEntrega).toLocaleDateString("es-MX") : "-",
      orden.cliente?.nombre || "-",
      orden.cliente?.empresa || "-",
      `${orden.marcaEquipo} ${orden.modeloEquipo}`,
      orden.serieEquipo || "-",
      tipoLabels[orden.tipoServicio] || orden.tipoServicio,
      orden.tecnico?.name || "Sin asignar",
      orden.fallaReportada || "-",
      orden.diagnostico || "-",
      orden.cotizacion ? `${Number(orden.cotizacion).toLocaleString("es-MX")}` : "-",
    ];
    values.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.font = { name: "Arial", size: 9 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
    // Zebra stripe
    if (idx % 2 === 1) {
      values.forEach((_, i) => {
        row.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      });
    }
  });

  // Resumen al final
  const summaryRow = 5 + ordenes.length + 1;
  sheet.getCell(`A${summaryRow}`).value = `Total: ${ordenes.length} órdenes`;
  sheet.getCell(`A${summaryRow}`).font = { name: "Arial", size: 10, bold: true };

  // Generar buffer
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
