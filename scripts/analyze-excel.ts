/**
 * Script para analizar la estructura de los Excel de referencia
 */
import ExcelJS from "exceljs";
import path from "path";

async function analyzeExcel(filePath: string, name: string) {
  console.log("\n" + "=".repeat(70));
  console.log(`ANÁLISIS: ${name}`);
  console.log("=".repeat(70));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log(`\nHojas encontradas: ${workbook.worksheets.length}`);

  for (const worksheet of workbook.worksheets) {
    console.log(`\n--- Hoja: "${worksheet.name}" ---`);
    console.log(`Filas: ${worksheet.rowCount}, Columnas: ${worksheet.columnCount}`);

    // Mostrar las primeras 15 filas para entender la estructura
    console.log("\nContenido (primeras 15 filas):");

    for (let rowNum = 1; rowNum <= Math.min(15, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const cells: string[] = [];

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= 15) { // Máximo 15 columnas
          let value = cell.value;
          if (value === null || value === undefined) {
            cells.push("(vacío)");
          } else if (typeof value === "object" && "richText" in value) {
            cells.push(value.richText.map((r: { text: string }) => r.text).join(""));
          } else if (typeof value === "object" && "result" in value) {
            cells.push(String(value.result));
          } else {
            cells.push(String(value).substring(0, 25));
          }
        }
      });

      if (cells.some(c => c !== "(vacío)")) {
        console.log(`  Fila ${rowNum}: ${cells.join(" | ")}`);
      }
    }

    // Buscar encabezados (primera fila con contenido significativo)
    console.log("\nEncabezados detectados:");
    for (let rowNum = 1; rowNum <= 10; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const headers: { col: number; value: string }[] = [];

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const value = cell.value;
        if (value && typeof value === "string" && value.length > 2) {
          headers.push({ col: colNumber, value: value.substring(0, 40) });
        }
      });

      if (headers.length >= 3) {
        console.log(`  Fila ${rowNum}:`);
        headers.forEach(h => console.log(`    Col ${h.col}: ${h.value}`));
        break;
      }
    }

    // Analizar estructura de columnas
    console.log("\nColumnas con datos:");
    const colStats: Map<number, { header: string; samples: string[] }> = new Map();

    for (let colNum = 1; colNum <= Math.min(20, worksheet.columnCount); colNum++) {
      const col = worksheet.getColumn(colNum);
      let header = "";
      const samples: string[] = [];

      col.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber <= 3) {
          if (cell.value && typeof cell.value === "string") {
            header = cell.value.substring(0, 30);
          }
        } else if (samples.length < 3 && cell.value) {
          samples.push(String(cell.value).substring(0, 20));
        }
      });

      if (header || samples.length > 0) {
        colStats.set(colNum, { header, samples });
      }
    }

    colStats.forEach((stats, colNum) => {
      console.log(`  Col ${colNum}: "${stats.header}" -> [${stats.samples.join(", ")}]`);
    });
  }
}

async function main() {
  const baseDir = path.resolve(__dirname, "../../");

  try {
    // Analizar TORREY
    await analyzeExcel(
      path.join(baseDir, "NOVIEMBRE ' 2025.xlsx"),
      "NOVIEMBRE ' 2025.xlsx (TORREY)"
    );
  } catch (e) {
    console.error("Error analizando TORREY:", e);
  }

  try {
    // Analizar REPARE
    await analyzeExcel(
      path.join(baseDir, "F. Lay Out Repare 2025.xlsx"),
      "F. Lay Out Repare 2025.xlsx (REPARE)"
    );
  } catch (e) {
    console.error("Error analizando REPARE:", e);
  }
}

main();
