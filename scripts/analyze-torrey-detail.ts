/**
 * Análisis detallado del formato TORREY
 */
import ExcelJS from "exceljs";
import path from "path";

async function analyzeTorreyDetail() {
  const filePath = path.resolve(__dirname, "../../NOVIEMBRE ' 2025.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];

  console.log("=".repeat(70));
  console.log("ESTRUCTURA DETALLADA DEL FORMATO TORREY");
  console.log("=".repeat(70));

  // Ver las primeras 50 filas con más detalle
  console.log("\nPrimeras 50 filas (estructura del formulario):\n");

  for (let rowNum = 1; rowNum <= 50; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const cells: string[] = [];

    for (let colNum = 1; colNum <= 8; colNum++) {
      const cell = row.getCell(colNum);
      let value = "(vacío)";

      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === "object" && "richText" in cell.value) {
          value = cell.value.richText.map((r: { text: string }) => r.text).join("");
        } else if (typeof cell.value === "object" && "result" in cell.value) {
          value = String(cell.value.result);
        } else if (cell.value instanceof Date) {
          value = cell.value.toISOString().split("T")[0];
        } else {
          value = String(cell.value);
        }
      }

      // Mostrar info de merge
      if (cell.isMerged) {
        value = `[M]${value}`;
      }

      cells.push(value.substring(0, 30).padEnd(32));
    }

    // Solo mostrar filas con contenido
    if (cells.some(c => !c.startsWith("(vacío)"))) {
      console.log(`Fila ${String(rowNum).padStart(2)}: ${cells.join("|")}`);
    }
  }

  // Analizar un "bloque" completo de reporte (parece que cada reporte ocupa varias filas)
  console.log("\n\n" + "=".repeat(70));
  console.log("ANÁLISIS DE BLOQUES (cada reporte individual)");
  console.log("=".repeat(70));

  // Buscar patrones - buscar "REPORTE DE SERVICIO" que indica inicio de bloque
  let blockCount = 0;
  let blockStarts: number[] = [];

  for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
    const cell = worksheet.getCell(rowNum, 1);
    const value = String(cell.value || "");
    if (value.includes("REPORTE DE SERVICIO EN GA")) {
      blockStarts.push(rowNum);
      blockCount++;
      if (blockCount >= 3) break; // Solo primeros 3 bloques
    }
  }

  console.log(`\nBloques encontrados: ${blockStarts.length > 0 ? blockCount : "patrón no encontrado"}`);
  console.log(`Inicio de bloques: filas ${blockStarts.join(", ")}`);

  if (blockStarts.length >= 2) {
    const blockSize = blockStarts[1] - blockStarts[0];
    console.log(`Tamaño estimado de cada bloque: ${blockSize} filas`);
  }

  // Mostrar segundo bloque completo si existe
  if (blockStarts.length >= 2) {
    const start = blockStarts[1];
    const end = blockStarts[2] ? blockStarts[2] - 1 : start + 40;

    console.log(`\n\nBLOQUE 2 (filas ${start}-${end}):`);
    console.log("-".repeat(70));

    for (let rowNum = start; rowNum <= end; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const cells: string[] = [];

      for (let colNum = 1; colNum <= 8; colNum++) {
        const cell = row.getCell(colNum);
        let value = "";

        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === "object" && "richText" in cell.value) {
            value = cell.value.richText.map((r: { text: string }) => r.text).join("");
          } else if (typeof cell.value === "object" && "result" in cell.value) {
            value = String(cell.value.result);
          } else if (cell.value instanceof Date) {
            value = cell.value.toLocaleDateString("es-MX");
          } else {
            value = String(cell.value);
          }
        }

        cells.push(value.substring(0, 25).padEnd(27));
      }

      if (cells.some(c => c.trim() !== "")) {
        console.log(`${String(rowNum).padStart(4)}: ${cells.join("|")}`);
      }
    }
  }
}

analyzeTorreyDetail().catch(console.error);
