import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { generateTorreyReport } from "@/lib/reportes/torrey-generator";
import { generateRepareReport } from "@/lib/reportes/repare-generator";
import { TipoServicio, EstadoOrden, Prioridad, CondicionEquipo } from "@prisma/client";

// Mock data para pruebas
const mockCliente = {
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
};

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

const mockOrdenGarantia = {
  id: "orden-1",
  folio: "OS-2024-0001",
  tipoServicio: TipoServicio.GARANTIA,
  estado: EstadoOrden.LISTO_ENTREGA,
  prioridad: Prioridad.ALTA,
  clienteId: "cliente-1",
  cliente: mockCliente,
  tecnicoId: "tecnico-1",
  tecnico: mockTecnico,
  creadoPorId: "admin-1",
  marcaEquipo: "Torrey",
  modeloEquipo: "L-EQ 10/20",
  serieEquipo: "LEQ-2024-001234",
  accesorios: { plato: true, eliminador: true, antena: false, candado: true },
  condicionEquipo: CondicionEquipo.REGULAR,
  fallaReportada: "No enciende, cliente reporta que dejó de funcionar después de una descarga eléctrica",
  diagnostico: "Fuente de poder dañada por sobrecarga eléctrica.",
  notasTecnico: "Se reemplazó fuente de poder completa. Equipo funcionando correctamente.",
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
  evidencias: [],
};

const mockOrdenRepare = {
  id: "orden-2",
  folio: "OS-2024-0005",
  tipoServicio: TipoServicio.REPARE,
  estado: EstadoOrden.RECIBIDO,
  prioridad: Prioridad.URGENTE,
  clienteId: "cliente-2",
  cliente: {
    ...mockCliente,
    id: "cliente-2",
    nombre: "Carmen Ruiz",
    empresa: "Cremería Lupita",
    telefono: "33 4567 8901",
    email: "cremeria.lupita@gmail.com",
    direccion: "Mercado San Juan de Dios Local 42",
    codigoDistribuidor: "DIST-002",
  },
  tecnicoId: null,
  tecnico: null,
  creadoPorId: "admin-1",
  marcaEquipo: "Imbera",
  modeloEquipo: "VR-17",
  serieEquipo: "VR17-2023-112233",
  accesorios: null,
  condicionEquipo: CondicionEquipo.MALA,
  fallaReportada: "Refrigerador no enfría, compresor no arranca.",
  diagnostico: null,
  notasTecnico: "Verificar compresor y sistema eléctrico",
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
  evidencias: [],
};

describe("Generador de Reportes TORREY", () => {
  describe("generateTorreyReport", () => {
    it("genera un Buffer válido de Excel", async () => {
      const buffer = await generateTorreyReport([mockOrdenGarantia], 11, 2024);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("crea un workbook con estructura correcta", async () => {
      const buffer = await generateTorreyReport([mockOrdenGarantia], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      // Debe tener al menos una hoja
      expect(workbook.worksheets.length).toBeGreaterThanOrEqual(1);

      // La hoja debe llamarse "REPORTE DE SERVICIO"
      const sheet = workbook.getWorksheet("REPORTE DE SERVICIO");
      expect(sheet).toBeDefined();
    });

    it("incluye el título correcto en el reporte", async () => {
      const buffer = await generateTorreyReport([mockOrdenGarantia], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("REPORTE DE SERVICIO")!;

      // El título está en la celda A1
      const titleCell = sheet.getCell(1, 1);
      expect(titleCell.value).toBe("REPORTE DE SERVICIO EN GARANTÍA DE BÁSCULAS");
    });

    it("incluye datos del cliente correctamente", async () => {
      const buffer = await generateTorreyReport([mockOrdenGarantia], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("REPORTE DE SERVICIO")!;

      // Buscar el nombre del cliente en alguna celda
      let foundCliente = false;
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value && cell.value.toString().includes("Juan Pérez")) {
            foundCliente = true;
          }
        });
      });

      expect(foundCliente).toBe(true);
    });

    it("incluye datos del equipo correctamente", async () => {
      const buffer = await generateTorreyReport([mockOrdenGarantia], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("REPORTE DE SERVICIO")!;

      // Buscar el modelo del equipo
      let foundModelo = false;
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value && cell.value.toString().includes("L-EQ 10/20")) {
            foundModelo = true;
          }
        });
      });

      expect(foundModelo).toBe(true);
    });

    it("maneja múltiples órdenes correctamente", async () => {
      const orden2 = {
        ...mockOrdenGarantia,
        id: "orden-3",
        folio: "OS-2024-0003",
        modeloEquipo: "LEQ-40/80",
        cliente: { ...mockCliente, nombre: "María García" },
      };

      const buffer = await generateTorreyReport([mockOrdenGarantia, orden2], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("REPORTE DE SERVICIO")!;

      // Buscar ambos clientes
      let foundJuan = false;
      let foundMaria = false;
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          const value = cell.value?.toString() || "";
          if (value.includes("Juan Pérez")) foundJuan = true;
          if (value.includes("María García")) foundMaria = true;
        });
      });

      expect(foundJuan).toBe(true);
      expect(foundMaria).toBe(true);
    });

    it("genera mensaje cuando no hay órdenes", async () => {
      const buffer = await generateTorreyReport([], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("REPORTE DE SERVICIO")!;

      // Buscar mensaje de "No hay órdenes"
      let foundNoOrdenes = false;
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value && cell.value.toString().includes("No hay órdenes")) {
            foundNoOrdenes = true;
          }
        });
      });

      expect(foundNoOrdenes).toBe(true);
    });

    it("incluye falla reportada y diagnóstico", async () => {
      const buffer = await generateTorreyReport([mockOrdenGarantia], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("REPORTE DE SERVICIO")!;

      let foundFalla = false;
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value && cell.value.toString().includes("No enciende")) {
            foundFalla = true;
          }
        });
      });

      expect(foundFalla).toBe(true);
    });

    it("maneja accesorios correctamente con checkboxes", async () => {
      const buffer = await generateTorreyReport([mockOrdenGarantia], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("REPORTE DE SERVICIO")!;

      // Buscar checkboxes marcados (☑) y desmarcados (☐)
      let foundChecked = false;
      let foundUnchecked = false;
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          const value = cell.value?.toString() || "";
          if (value.includes("☑")) foundChecked = true;
          if (value.includes("☐")) foundUnchecked = true;
        });
      });

      expect(foundChecked).toBe(true);
      expect(foundUnchecked).toBe(true);
    });
  });
});

describe("Generador de Reportes REPARE", () => {
  describe("generateRepareReport", () => {
    it("genera un Buffer válido de Excel", async () => {
      const buffer = await generateRepareReport([mockOrdenRepare], 11, 2024);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("crea un workbook con hojas RUTA y RESUMEN", async () => {
      const buffer = await generateRepareReport([mockOrdenRepare], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      expect(workbook.worksheets.length).toBe(2);
      expect(workbook.getWorksheet("RUTA")).toBeDefined();
      expect(workbook.getWorksheet("RESUMEN")).toBeDefined();
    });

    it("tiene las columnas correctas en la hoja RUTA", async () => {
      const buffer = await generateRepareReport([mockOrdenRepare], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("RUTA")!;

      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell) => {
        if (cell.value) headers.push(cell.value.toString());
      });

      expect(headers).toContain("Modelo");
      expect(headers).toContain("Serie");
      expect(headers).toContain("Falla Reportada & NOTAS");
      expect(headers).toContain("Latitud");
      expect(headers).toContain("Longitud(-)");
    });

    it("incluye datos del equipo correctamente", async () => {
      const buffer = await generateRepareReport([mockOrdenRepare], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("RUTA")!;

      // Fila 3 es la primera fila de datos (1=headers, 2=instrucciones)
      const dataRow = sheet.getRow(3);

      expect(dataRow.getCell(1).value).toBe("VR-17"); // Modelo
      expect(dataRow.getCell(2).value).toBe("VR17-2023-112233"); // Serie
    });

    it("parsea coordenadas GPS correctamente", async () => {
      const buffer = await generateRepareReport([mockOrdenRepare], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("RUTA")!;

      const dataRow = sheet.getRow(3);

      // Columnas 16 y 17 son latitud y longitud
      expect(dataRow.getCell(16).value).toBe("20.6597");
      expect(dataRow.getCell(17).value).toBe("-103.3496");
    });

    it("incluye información del cliente", async () => {
      const buffer = await generateRepareReport([mockOrdenRepare], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("RUTA")!;

      const dataRow = sheet.getRow(3);

      // Nombre punto de venta (columna 8)
      expect(dataRow.getCell(8).value).toBe("Cremería Lupita");

      // Teléfono (columna 18)
      expect(dataRow.getCell(18).value).toBe("33 4567 8901");
    });

    it("genera resumen con totales correctos", async () => {
      const buffer = await generateRepareReport([mockOrdenRepare], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("RESUMEN")!;

      // Buscar el total de órdenes
      let foundTotal = false;
      sheet.eachRow((row) => {
        const concepto = row.getCell(1).value?.toString() || "";
        const valor = row.getCell(2).value;
        if (concepto === "Total de órdenes" && valor === 1) {
          foundTotal = true;
        }
      });

      expect(foundTotal).toBe(true);
    });

    it("genera mensaje cuando no hay órdenes", async () => {
      const buffer = await generateRepareReport([], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("RUTA")!;

      let foundNoOrdenes = false;
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value && cell.value.toString().includes("No hay órdenes")) {
            foundNoOrdenes = true;
          }
        });
      });

      expect(foundNoOrdenes).toBe(true);
    });

    it("maneja múltiples órdenes correctamente", async () => {
      const orden2 = {
        ...mockOrdenRepare,
        id: "orden-4",
        modeloEquipo: "VR-25",
        serieEquipo: "VR25-2024-999999",
      };

      const buffer = await generateRepareReport([mockOrdenRepare, orden2], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("RUTA")!;

      // Debe haber datos en filas 3 y 4
      expect(sheet.getRow(3).getCell(1).value).toBe("VR-17");
      expect(sheet.getRow(4).getCell(1).value).toBe("VR-25");
    });

    it("incluye código de distribuidor si existe", async () => {
      const buffer = await generateRepareReport([mockOrdenRepare], 11, 2024);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet("RUTA")!;

      const dataRow = sheet.getRow(3);

      // Columna 6 es numDistribuidor
      expect(dataRow.getCell(6).value).toBe("DIST-002");
    });
  });
});

describe("Integración de Reportes", () => {
  it("ambos generadores producen archivos Excel válidos", async () => {
    const bufferTorrey = await generateTorreyReport([mockOrdenGarantia], 12, 2024);
    const bufferRepare = await generateRepareReport([mockOrdenRepare], 12, 2024);

    // Verificar que ambos son Buffers válidos
    expect(Buffer.isBuffer(bufferTorrey)).toBe(true);
    expect(Buffer.isBuffer(bufferRepare)).toBe(true);

    // Verificar que se pueden cargar como workbooks
    const workbookTorrey = new ExcelJS.Workbook();
    const workbookRepare = new ExcelJS.Workbook();

    await expect(workbookTorrey.xlsx.load(bufferTorrey)).resolves.not.toThrow();
    await expect(workbookRepare.xlsx.load(bufferRepare)).resolves.not.toThrow();
  });

  it("los reportes incluyen metadatos del creador", async () => {
    const buffer = await generateTorreyReport([mockOrdenGarantia], 11, 2024);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.creator).toBe("MARMAQ Servicios");
    expect(workbook.created).toBeInstanceOf(Date);
  });
});
