"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, Button } from "@/components/ui";
import {
  ReporteTecnicos,
  ReporteTipoServicio,
  ReporteTiempos,
} from "@/components/reportes";
import {
  ArrowLeft,
  Loader2,
  Filter,
  Calendar,
  Users,
  Layers,
  RefreshCw,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ReportesData {
  filtros: {
    fechaDesde: string | null;
    fechaHasta: string | null;
    tecnicoId: string | null;
    tipoServicio: string | null;
  };
  resumen: {
    totalOrdenes: number;
    ordenesActivas: number;
    ordenesCompletadas: number;
    ingresosTotales: number;
  };
  reporteTecnicos: {
    tecnicoId: string;
    nombre: string;
    asignadas: number;
    completadas: number;
    pendientes: number;
    tiempoPromedioDias: number;
    eficiencia: number;
  }[];
  rankingTecnicos: {
    tecnicoId: string;
    nombre: string;
    asignadas: number;
    completadas: number;
    pendientes: number;
    tiempoPromedioDias: number;
    eficiencia: number;
  }[];
  reporteTipoServicio: {
    tipo: string;
    tipoLabel: string;
    cantidad: number;
    ingresos: number;
    cotizacionesEnviadas: number;
    cotizacionesAprobadas: number;
    cotizacionesRechazadas: number;
    tasaRechazo: number;
  }[];
  porTipoPorMes: {
    mes: string;
    GARANTIA: number;
    CENTRO_SERVICIO: number;
    POR_COBRAR: number;
    REPARE: number;
  }[];
  tiemposPorEstado: {
    estado: string;
    estadoLabel: string;
    cantidad: number;
    tiempoPromedioDias: number;
  }[];
  ordenesExcedidas: {
    id: string;
    folio: string;
    estado: string;
    estadoLabel: string;
    cliente: string;
    tecnico: string;
    diasTranscurridos: number;
    fechaRecepcion: string;
  }[];
  cuellosDeBottella: {
    estado: string;
    estadoLabel: string;
    cantidad: number;
    tiempoPromedioDias: number;
  }[];
  listaTecnicos: { id: string; name: string }[];
}

export default function ReportesAvanzadosPage() {
  const [data, setData] = useState<ReportesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [tecnicoId, setTecnicoId] = useState<string>("");
  const [tipoServicio, setTipoServicio] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      if (tecnicoId) params.append("tecnicoId", tecnicoId);
      if (tipoServicio) params.append("tipoServicio", tipoServicio);

      const response = await fetch(`/api/reportes/avanzados?${params.toString()}`);

      if (response.status === 403) {
        setError("No tienes permisos para ver reportes avanzados");
        return;
      }

      if (!response.ok) {
        throw new Error("Error al cargar reportes");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, tecnicoId, tipoServicio]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setFechaDesde("");
    setFechaHasta("");
    setTecnicoId("");
    setTipoServicio("");
  };

  const hasActiveFilters = fechaDesde || fechaHasta || tecnicoId || tipoServicio;

  // Exportar a Excel
  const exportToExcel = (reportType: "tecnicos" | "tipoServicio" | "tiempos") => {
    if (!data) return;

    let sheetData: Record<string, unknown>[] = [];
    let fileName = "";

    switch (reportType) {
      case "tecnicos":
        sheetData = data.reporteTecnicos.map((t) => ({
          Técnico: t.nombre,
          Asignadas: t.asignadas,
          Completadas: t.completadas,
          Pendientes: t.pendientes,
          "Tiempo Promedio (días)": t.tiempoPromedioDias,
          "Eficiencia (%)": t.eficiencia,
        }));
        fileName = "reporte-tecnicos";
        break;

      case "tipoServicio":
        sheetData = data.reporteTipoServicio.map((t) => ({
          "Tipo de Servicio": t.tipoLabel,
          Cantidad: t.cantidad,
          Ingresos: t.ingresos,
          "Cotizaciones Enviadas": t.cotizacionesEnviadas,
          "Cotizaciones Aprobadas": t.cotizacionesAprobadas,
          "Cotizaciones Rechazadas": t.cotizacionesRechazadas,
          "Tasa de Rechazo (%)": t.tasaRechazo,
        }));
        fileName = "reporte-tipo-servicio";
        break;

      case "tiempos":
        sheetData = data.tiemposPorEstado.map((t) => ({
          Estado: t.estadoLabel,
          "Órdenes Activas": t.cantidad,
          "Tiempo Promedio (días)": t.tiempoPromedioDias,
        }));

        // Agregar órdenes excedidas en otra hoja
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws1, "Tiempos por Estado");

        if (data.ordenesExcedidas.length > 0) {
          const ordenesSheet = data.ordenesExcedidas.map((o) => ({
            Folio: o.folio,
            Cliente: o.cliente,
            Técnico: o.tecnico,
            Estado: o.estadoLabel,
            "Días Transcurridos": o.diasTranscurridos,
          }));
          const ws2 = XLSX.utils.json_to_sheet(ordenesSheet);
          XLSX.utils.book_append_sheet(wb, ws2, "Órdenes Excedidas");
        }

        const dateStr = new Date().toISOString().split("T")[0];
        XLSX.writeFile(wb, `reporte-tiempos-${dateStr}.xlsx`);
        return;
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `${fileName}-${dateStr}.xlsx`);
  };

  const exportAllToExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Resumen
    const resumenSheet = XLSX.utils.json_to_sheet([
      {
        "Total Órdenes": data.resumen.totalOrdenes,
        "Órdenes Activas": data.resumen.ordenesActivas,
        "Órdenes Completadas": data.resumen.ordenesCompletadas,
        "Ingresos Totales": data.resumen.ingresosTotales,
      },
    ]);
    XLSX.utils.book_append_sheet(wb, resumenSheet, "Resumen");

    // Técnicos
    const tecnicosSheet = XLSX.utils.json_to_sheet(
      data.reporteTecnicos.map((t) => ({
        Técnico: t.nombre,
        Asignadas: t.asignadas,
        Completadas: t.completadas,
        Pendientes: t.pendientes,
        "Tiempo Promedio (días)": t.tiempoPromedioDias,
        "Eficiencia (%)": t.eficiencia,
      }))
    );
    XLSX.utils.book_append_sheet(wb, tecnicosSheet, "Técnicos");

    // Tipo de Servicio
    const tipoSheet = XLSX.utils.json_to_sheet(
      data.reporteTipoServicio.map((t) => ({
        Tipo: t.tipoLabel,
        Cantidad: t.cantidad,
        Ingresos: t.ingresos,
        "Tasa Rechazo (%)": t.tasaRechazo,
      }))
    );
    XLSX.utils.book_append_sheet(wb, tipoSheet, "Tipo Servicio");

    // Tiempos
    const tiemposSheet = XLSX.utils.json_to_sheet(
      data.tiemposPorEstado.map((t) => ({
        Estado: t.estadoLabel,
        Órdenes: t.cantidad,
        "Tiempo Promedio (días)": t.tiempoPromedioDias,
      }))
    );
    XLSX.utils.book_append_sheet(wb, tiemposSheet, "Tiempos");

    // Órdenes Excedidas
    if (data.ordenesExcedidas.length > 0) {
      const excedidasSheet = XLSX.utils.json_to_sheet(
        data.ordenesExcedidas.map((o) => ({
          Folio: o.folio,
          Cliente: o.cliente,
          Técnico: o.tecnico,
          Estado: o.estadoLabel,
          Días: o.diasTranscurridos,
        }))
      );
      XLSX.utils.book_append_sheet(wb, excedidasSheet, "Órdenes Excedidas");
    }

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `reportes-avanzados-${dateStr}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#31A7D4] animate-spin" />
          <p className="text-sm text-gray-500">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <Link href="/reportes" className="text-[#31A7D4] hover:underline">
            Volver a reportes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/reportes"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-[#092139] flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#31A7D4]" />
              Reportes Avanzados
            </h1>
            <p className="text-sm text-gray-500">Análisis detallado del taller</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-[#31A7D4] rounded-full" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualizar
          </Button>
          <Button size="sm" onClick={exportAllToExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Exportar Todo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Desde
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Hasta
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Users className="w-4 h-4 inline mr-1" />
                  Técnico
                </label>
                <select
                  value={tecnicoId}
                  onChange={(e) => setTecnicoId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent text-sm"
                >
                  <option value="">Todos</option>
                  {data?.listaTecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Layers className="w-4 h-4 inline mr-1" />
                  Tipo de Servicio
                </label>
                <select
                  value={tipoServicio}
                  onChange={(e) => setTipoServicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent text-sm"
                >
                  <option value="">Todos</option>
                  <option value="GARANTIA">Garantía</option>
                  <option value="CENTRO_SERVICIO">Centro Servicio</option>
                  <option value="POR_COBRAR">Por Cobrar</option>
                  <option value="REPARE">REPARE</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Total Órdenes</p>
            <p className="text-2xl font-bold text-[#092139]">{data.resumen.totalOrdenes}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Órdenes Activas</p>
            <p className="text-2xl font-bold text-orange-600">{data.resumen.ordenesActivas}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Completadas</p>
            <p className="text-2xl font-bold text-green-600">{data.resumen.ordenesCompletadas}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Ingresos Totales</p>
            <p className="text-2xl font-bold text-[#31A7D4]">
              ${data.resumen.ingresosTotales.toLocaleString("es-MX")}
            </p>
          </div>
        </div>
      )}

      {/* Reportes */}
      {data && (
        <div className="space-y-6">
          <ReporteTecnicos
            data={data.reporteTecnicos}
            ranking={data.rankingTecnicos}
            onExport={() => exportToExcel("tecnicos")}
          />

          <ReporteTipoServicio
            data={data.reporteTipoServicio}
            porMes={data.porTipoPorMes}
            onExport={() => exportToExcel("tipoServicio")}
          />

          <ReporteTiempos
            tiemposPorEstado={data.tiemposPorEstado}
            ordenesExcedidas={data.ordenesExcedidas}
            cuellosDeBottella={data.cuellosDeBottella}
            onExport={() => exportToExcel("tiempos")}
          />
        </div>
      )}
    </div>
  );
}
