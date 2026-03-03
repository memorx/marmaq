import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/db/prisma";
import { STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types/ordenes";
import { canViewOrden, unauthorizedResponse } from "@/lib/auth/authorize";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = Promise<{ id: string }>;

// Colores MARMAQ
const COLORS = {
  primary: "#31A7D4",
  secondary: "#092139",
  gray: "#6B7280",
  lightGray: "#E5E7EB",
  white: "#FFFFFF",
};

// Condiciones formato TORREY
const PARTES_SIN_GARANTIA =
  "Motores, compresores, arrancadores, balastras, lámparas (en caso de estar quemados) empaques, cristales y partes de plástico. Estas piezas no se garantizan pues están expuestas a que se les puede dar un mal uso (por descuido u omisión), variaciones de voltaje o por no dar el mantenimiento preventivo de acuerdo con el instructivo o manual de operación";
const GARANTIA_TRABAJO =
  "GARANTIA POR 30 DIAS SOBRE TRABAJO REALIZADO";
const AVISO_REMATE =
  "DESPUES DE 60 DIAS DE TRABAJO TERMINADO SU EQUIPO SE REMATARA PARA RECUPERAR GASTOS";

// Formato de fecha
function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "-";
  return `$${Number(amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
}

function formatAccesorios(accesorios: unknown): string {
  if (!accesorios) return "-";
  if (typeof accesorios === "string") return accesorios;
  const acc = accesorios as Record<string, boolean>;
  const lista = Object.entries(acc).filter(([, v]) => v).map(([k]) => k);
  return lista.length > 0 ? lista.join(", ") : "-";
}

// ============ GET /api/ordenes/[id]/pdf ============
// Generar PDF de hoja de servicio
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
    const url = new URL(request.url);
    const tipo = url.searchParams.get("tipo") || "completo";

    // Obtener orden con todas las relaciones
    const orden = await prisma.orden.findUnique({
      where: { id },
      include: {
        cliente: true,
        tecnico: {
          select: { id: true, name: true },
        },
        materialesUsados: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    if (!canViewOrden(session, orden)) {
      return unauthorizedResponse("No tienes permisos para ver esta orden");
    }

    // Determinar título y nombre de archivo según tipo
    const isComprobante = tipo === "comprobante";
    const docTitle = isComprobante ? "Comprobante de Recepción" : "Hoja de Servicio";
    const fileName = isComprobante ? `comprobante-${orden.folio}.pdf` : `hoja-servicio-${orden.folio}.pdf`;

    // Crear documento PDF
    const marginLeft = isComprobante ? 40 : 50;
    const marginRight = isComprobante ? 40 : 50;
    const doc = new PDFDocument({
      size: "LETTER",
      margins: isComprobante
        ? { top: 40, bottom: 30, left: 40, right: 40 }
        : { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `${docTitle} - ${orden.folio}`,
        Author: "MARMAQ",
        Subject: docTitle,
      },
    });

    // Recopilar chunks del PDF
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Promesa para cuando termine el PDF
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", reject);
    });

    // Variables de posición
    const pageWidth = 612; // Letter width in points
    const contentWidth = pageWidth - marginLeft - marginRight;
    let y = isComprobante ? 40 : 50;

    // ============ HEADER CON LOGO (compartido) ============
    const logoPath = path.join(process.cwd(), "public", "images", "logo-marmaq.jpeg");
    const logoExists = fs.existsSync(logoPath);
    const logoWidth = isComprobante ? 80 : 120;

    if (logoExists) {
      try {
        doc.image(logoPath, marginLeft, y, { width: logoWidth });
        y += isComprobante ? 85 : 130;
      } catch {
        doc.fontSize(isComprobante ? 18 : 24).fillColor(COLORS.secondary).font("Helvetica-Bold");
        doc.text("MARMAQ", marginLeft, y);
        y += isComprobante ? 25 : 35;
      }
    } else {
      doc.fontSize(isComprobante ? 18 : 24).fillColor(COLORS.secondary).font("Helvetica-Bold");
      doc.text("MARMAQ", marginLeft, y);
      doc.fontSize(isComprobante ? 8 : 10).fillColor(COLORS.gray).font("Helvetica");
      doc.text("Servicio Técnico Especializado", marginLeft, y + (isComprobante ? 22 : 28));
      y += isComprobante ? 38 : 50;
    }

    // Título del documento y folio (alineado a la derecha)
    const titleTop = isComprobante ? 40 : 50;
    doc.fontSize(isComprobante ? 13 : 18).fillColor(COLORS.secondary).font("Helvetica-Bold");
    doc.text(isComprobante ? "COMPROBANTE DE RECEPCIÓN" : "HOJA DE SERVICIO", pageWidth - marginRight - 250, titleTop, {
      width: 250,
      align: "right",
    });

    doc.fontSize(isComprobante ? 11 : 14).fillColor(COLORS.primary).font("Helvetica-Bold");
    doc.text(orden.folio, pageWidth - marginRight - 250, titleTop + (isComprobante ? 35 : 45), {
      width: 250,
      align: "right",
    });

    doc.fontSize(isComprobante ? 8 : 10).fillColor(COLORS.gray).font("Helvetica");
    doc.text(`Fecha: ${formatDate(orden.fechaRecepcion)}`, pageWidth - marginRight - 250, titleTop + (isComprobante ? 50 : 65), {
      width: 250,
      align: "right",
    });

    y = Math.max(y, isComprobante ? 130 : 180);

    // Línea separadora
    doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
    y += isComprobante ? 10 : 15;

    // ============ DATOS DEL CLIENTE (ambos tipos) ============
    const sectionFontSize = isComprobante ? 10 : 12;
    const bodyFontSize = isComprobante ? 9 : 10;
    const rowHeight = isComprobante ? 12 : 15;
    const sectionGap = isComprobante ? 6 : 10;
    const headerGap = isComprobante ? 14 : 20;

    doc.fontSize(sectionFontSize).fillColor(COLORS.secondary).font("Helvetica-Bold");
    doc.text("DATOS DEL CLIENTE", marginLeft, y);
    y += headerGap;

    const clienteData: [string, string][] = [
      ["Nombre:", String(orden.cliente.nombre || "-")],
      ["Empresa:", String(orden.cliente.empresa || "-")],
    ];
    // Comprobante no incluye teléfono/email del cliente
    if (!isComprobante) {
      clienteData.push(
        ["Teléfono:", String(orden.cliente.telefono || "-")],
        ["Email:", String(orden.cliente.email || "-")],
      );
    }

    doc.fontSize(bodyFontSize).font("Helvetica");
    for (const [label, value] of clienteData) {
      doc.fillColor(COLORS.gray).text(label, marginLeft, y, { width: 80 });
      doc.fillColor(COLORS.secondary).text(value, marginLeft + 80, y, { width: contentWidth - 80 });
      y += rowHeight;
    }

    y += sectionGap;

    // ============ DATOS DEL EQUIPO (ambos tipos) ============
    doc.fontSize(sectionFontSize).fillColor(COLORS.secondary).font("Helvetica-Bold");
    doc.text("DATOS DEL EQUIPO", marginLeft, y);
    y += headerGap;

    const equipoData: [string, string][] = [
      ["Marca:", String(orden.marcaEquipo || "-")],
      ["Modelo:", String(orden.modeloEquipo || "-")],
      ["No. Serie:", String(orden.serieEquipo || "-")],
      ["Condición:", String(orden.condicionEquipo || "-")],
      ["Accesorios:", formatAccesorios(orden.accesorios)],
    ];

    doc.fontSize(bodyFontSize).font("Helvetica");
    for (const [label, value] of equipoData) {
      doc.fillColor(COLORS.gray).text(label, marginLeft, y, { width: 80 });
      doc.fillColor(COLORS.secondary).text(value, marginLeft + 80, y, { width: contentWidth - 80 });
      y += rowHeight;
    }

    y += sectionGap;

    // ============ TIPO DE SERVICIO (ambos tipos) ============
    doc.fontSize(sectionFontSize).fillColor(COLORS.secondary).font("Helvetica-Bold");
    doc.text("TIPO DE SERVICIO", marginLeft, y);
    y += headerGap;

    doc.fontSize(bodyFontSize).font("Helvetica-Bold");
    const tipoLabel = SERVICE_TYPE_LABELS[orden.tipoServicio];
    doc.fillColor(COLORS.primary).text(tipoLabel, marginLeft, y);

    if (!isComprobante) {
      doc.font("Helvetica").fillColor(COLORS.gray);
      doc.text(`  •  Estado: ${STATUS_LABELS[orden.estado]}`, marginLeft + 100, y);
    }
    y += isComprobante ? 15 : 20;

    // Datos de garantía si aplica
    if (orden.tipoServicio === "GARANTIA" && orden.numeroFactura) {
      doc.fontSize(bodyFontSize).fillColor(COLORS.gray).font("Helvetica");
      doc.text(`No. Factura: ${orden.numeroFactura}`, marginLeft, y);
      if (orden.fechaFactura) {
        doc.text(`  •  Fecha Factura: ${formatDate(orden.fechaFactura)}`, marginLeft + 150, y);
      }
      y += rowHeight;
    }

    // Datos REPARE si aplica
    if (orden.tipoServicio === "REPARE" && orden.numeroRepare) {
      doc.fontSize(bodyFontSize).fillColor(COLORS.gray).font("Helvetica");
      doc.text(`No. REPARE: ${orden.numeroRepare}`, marginLeft, y);
      y += rowHeight;
    }

    y += sectionGap;

    // ============ FALLA REPORTADA (ambos tipos) ============
    doc.fontSize(sectionFontSize).fillColor(COLORS.secondary).font("Helvetica-Bold");
    doc.text("FALLA REPORTADA", marginLeft, y);
    y += headerGap;

    doc.fontSize(bodyFontSize).fillColor(COLORS.secondary).font("Helvetica");
    const fallaText = orden.fallaReportada || "No especificada";
    doc.text(fallaText, marginLeft, y, { width: contentWidth });
    y += doc.heightOfString(fallaText, { width: contentWidth }) + (isComprobante ? 10 : 15);

    // ============ ANTICIPO (POR_COBRAR con anticipo > 0) ============
    if (orden.tipoServicio === "POR_COBRAR" && orden.anticipo && Number(orden.anticipo) > 0) {
      doc.fontSize(11).fillColor(COLORS.primary).font("Helvetica-Bold");
      doc.text(`ANTICIPO: ${formatCurrency(Number(orden.anticipo))}`, marginLeft, y);
      y += 20;
    }

    // ============ SECCIONES SOLO PARA REPORTE COMPLETO ============
    if (!isComprobante) {
      // DIAGNÓSTICO Y SOLUCIÓN
      doc.fontSize(12).fillColor(COLORS.secondary).font("Helvetica-Bold");
      doc.text("DIAGNÓSTICO Y SOLUCIÓN", marginLeft, y);
      y += 20;

      doc.fontSize(10).fillColor(COLORS.secondary).font("Helvetica");
      const diagnosticoText = orden.diagnostico || "Pendiente de diagnóstico";
      doc.text(diagnosticoText, marginLeft, y, { width: contentWidth });
      y += doc.heightOfString(diagnosticoText, { width: contentWidth }) + 15;

      // MATERIALES UTILIZADOS
      if (orden.materialesUsados && orden.materialesUsados.length > 0) {
        if (y > 550) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(12).fillColor(COLORS.secondary).font("Helvetica-Bold");
        doc.text("MATERIALES UTILIZADOS", marginLeft, y);
        y += 20;

        doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.gray);
        doc.text("Descripción", marginLeft, y);
        doc.text("Cant.", marginLeft + 280, y);
        doc.text("P. Unit.", marginLeft + 340, y);
        doc.text("Total", marginLeft + 420, y);
        y += 15;

        doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y).strokeColor(COLORS.lightGray).stroke();
        y += 5;

        let totalMateriales = 0;
        doc.fontSize(9).font("Helvetica").fillColor(COLORS.secondary);

        for (const mu of orden.materialesUsados) {
          const precioUnit = mu.precioUnitario ? Number(mu.precioUnitario) : 0;
          const subtotal = precioUnit * mu.cantidad;
          totalMateriales += subtotal;

          doc.text(mu.material.nombre, marginLeft, y, { width: 270 });
          doc.text(String(mu.cantidad), marginLeft + 280, y);
          doc.text(formatCurrency(precioUnit), marginLeft + 340, y);
          doc.text(formatCurrency(subtotal), marginLeft + 420, y);
          y += 15;
        }

        y += 5;
        doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y).strokeColor(COLORS.lightGray).stroke();
        y += 10;

        doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.secondary);
        doc.text("Total Materiales:", marginLeft + 320, y);
        doc.fillColor(COLORS.primary).text(formatCurrency(totalMateriales), marginLeft + 420, y);
        y += 25;
      }

      // TOTAL A PAGAR (Solo para POR_COBRAR)
      if (orden.tipoServicio === "POR_COBRAR" && orden.cotizacion) {
        if (y > 600) {
          doc.addPage();
          y = 50;
        }

        doc.rect(marginLeft, y, contentWidth, 50).fillColor("#F3F4F6").fill();

        doc.fontSize(12).fillColor(COLORS.secondary).font("Helvetica-Bold");
        doc.text("TOTAL A PAGAR", marginLeft + 20, y + 10);

        doc.fontSize(20).fillColor(COLORS.primary).font("Helvetica-Bold");
        doc.text(formatCurrency(Number(orden.cotizacion)), marginLeft + 20, y + 28);

        const statusText = orden.cotizacionAprobada ? "Cotización Aprobada" : "Cotización Pendiente";
        doc.fontSize(10).fillColor(COLORS.gray).font("Helvetica");
        doc.text(statusText, pageWidth - marginRight - 150, y + 20, { width: 130, align: "right" });

        y += 70;
      }
    }

    // ============ FIRMAS ============
    if (!isComprobante && y > 530) {
      doc.addPage();
      y = 50;
    }

    if (!isComprobante) {
      y = Math.max(y, 560); // Posicionar firmas al final (solo reporte completo)
    } else {
      y += 10; // Comprobante: posición dinámica
    }

    if (isComprobante) {
      // Comprobante: solo firma del cliente
      doc.fontSize(12).fillColor(COLORS.secondary).font("Helvetica-Bold");
      doc.text("Firma de Aceptacion", marginLeft, y);
      y += 20;

      const firmaWidth = contentWidth / 2;
      const firmaX = marginLeft + (contentWidth - firmaWidth) / 2;

      if (orden.firmaClienteUrl) {
        try {
          const firmaResponse = await fetch(orden.firmaClienteUrl);
          if (firmaResponse.ok) {
            const firmaBuffer = Buffer.from(await firmaResponse.arrayBuffer());
            doc.image(firmaBuffer, firmaX + 30, y, {
              width: firmaWidth - 60,
              height: 45,
              fit: [firmaWidth - 60, 45],
            });
          }
        } catch (firmaError) {
          console.error("Error loading signature image:", firmaError);
        }
      }

      doc.moveTo(firmaX, y + 50).lineTo(firmaX + firmaWidth, y + 50).strokeColor(COLORS.secondary).lineWidth(0.5).stroke();
      doc.fontSize(10).fillColor(COLORS.gray).font("Helvetica");
      doc.text("Cliente", firmaX, y + 55, { width: firmaWidth, align: "center" });
      doc.fontSize(9).fillColor(COLORS.secondary);
      doc.text(orden.cliente.nombre, firmaX, y + 70, { width: firmaWidth, align: "center" });

      if (orden.firmaFecha) {
        doc.fontSize(8).fillColor(COLORS.gray);
        doc.text(`Firmado: ${formatDateTime(orden.firmaFecha)}`, firmaX, y + 85, { width: firmaWidth, align: "center" });
      }
    } else {
      // Reporte completo: firma técnico + cliente
      doc.fontSize(12).fillColor(COLORS.secondary).font("Helvetica-Bold");
      doc.text("FIRMAS", marginLeft, y);
      y += 20;

      const firmaWidth = (contentWidth - 40) / 2;

      // Firma Técnico
      doc.moveTo(marginLeft, y + 50).lineTo(marginLeft + firmaWidth, y + 50).strokeColor(COLORS.secondary).lineWidth(0.5).stroke();
      doc.fontSize(10).fillColor(COLORS.gray).font("Helvetica");
      doc.text("Técnico Responsable", marginLeft, y + 55, { width: firmaWidth, align: "center" });
      doc.fontSize(9).fillColor(COLORS.secondary);
      doc.text(orden.tecnico?.name || "________________", marginLeft, y + 70, { width: firmaWidth, align: "center" });

      // Firma Cliente
      const firmaClienteX = marginLeft + firmaWidth + 40;

      if (orden.firmaClienteUrl) {
        try {
          const firmaResponse = await fetch(orden.firmaClienteUrl);
          if (firmaResponse.ok) {
            const firmaBuffer = Buffer.from(await firmaResponse.arrayBuffer());
            doc.image(firmaBuffer, firmaClienteX + 30, y, {
              width: firmaWidth - 60,
              height: 45,
              fit: [firmaWidth - 60, 45],
            });
          }
        } catch (firmaError) {
          console.error("Error loading signature image:", firmaError);
        }
      }

      doc.moveTo(firmaClienteX, y + 50).lineTo(firmaClienteX + firmaWidth, y + 50).strokeColor(COLORS.secondary).lineWidth(0.5).stroke();
      doc.fontSize(10).fillColor(COLORS.gray).font("Helvetica");
      doc.text("Cliente", firmaClienteX, y + 55, { width: firmaWidth, align: "center" });
      doc.fontSize(9).fillColor(COLORS.secondary);
      doc.text(orden.cliente.nombre, firmaClienteX, y + 70, { width: firmaWidth, align: "center" });

      if (orden.firmaFecha) {
        doc.fontSize(8).fillColor(COLORS.gray);
        doc.text(`Firmado: ${formatDateTime(orden.firmaFecha)}`, firmaClienteX, y + 85, { width: firmaWidth, align: "center" });
      }
    }

    // ============ PIE DE PÁGINA (FOOTER FIJO AL FONDO) ============
    if (isComprobante) {
      const pageHeight = 792; // Letter height in points
      const bottomMargin = 30;
      const franjaHeight = 20;

      // Pre-calculate disclaimer text height
      doc.fontSize(8).font("Helvetica");
      const disclaimerHeight = doc.heightOfString(PARTES_SIN_GARANTIA, { width: contentWidth });

      // Total footer block height (preserves same internal spacing)
      const footerBlockHeight = 5 + 14 + disclaimerHeight + 10 + franjaHeight + 6 + franjaHeight + 10 + 12 + 10;

      // Position footer so it ends at pageHeight - bottomMargin
      let fy = pageHeight - bottomMargin - footerBlockHeight;

      // Header "Partes sin garantía:"
      fy += 5;
      doc.fontSize(10).fillColor(COLORS.secondary).font("Helvetica-Bold");
      doc.text("Partes sin garantía:", marginLeft, fy);
      fy += 14;

      // Texto disclaimer
      doc.fontSize(8).fillColor(COLORS.gray).font("Helvetica");
      doc.text(PARTES_SIN_GARANTIA, marginLeft, fy, { width: contentWidth });
      fy += disclaimerHeight + 10;

      // Franja gris: garantía 30 días
      doc.rect(marginLeft, fy, contentWidth, franjaHeight).fillColor(COLORS.lightGray).fill();
      doc.fontSize(9).fillColor(COLORS.secondary).font("Helvetica-Bold");
      doc.text(GARANTIA_TRABAJO, marginLeft, fy + 5, { width: contentWidth, align: "center" });
      fy += franjaHeight + 6;

      // Franja gris: aviso remate 60 días
      doc.rect(marginLeft, fy, contentWidth, franjaHeight).fillColor(COLORS.lightGray).fill();
      doc.fontSize(9).fillColor(COLORS.secondary).font("Helvetica-Bold");
      doc.text(AVISO_REMATE, marginLeft, fy + 5, { width: contentWidth, align: "center" });
      fy += franjaHeight + 10;

      // Footer text
      doc.fontSize(7).fillColor(COLORS.gray).font("Helvetica");
      doc.text(
        `Conserve este comprobante. MARMAQ Servicio Técnico • ${formatDateTime(new Date())}`,
        marginLeft,
        fy,
        { width: contentWidth, align: "center" }
      );
      doc.text("Hoja 1 de 1", marginLeft, fy + 12, { width: contentWidth, align: "center" });
    } else {
      y = 750;
      doc.fontSize(8).fillColor(COLORS.gray).font("Helvetica");
      doc.text(
        `Documento generado el ${formatDateTime(new Date())} • MARMAQ Servicio Técnico`,
        marginLeft,
        y,
        { width: contentWidth, align: "center" }
      );
    }

    // Finalizar documento
    doc.end();

    // Esperar a que termine
    const pdfBuffer = await pdfPromise;

    // Devolver PDF (convertir Buffer a Uint8Array para NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Error al generar el PDF" },
      { status: 500 }
    );
  }
}
