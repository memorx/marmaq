"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Download, Loader2, FileText, Calendar, Filter, BarChart3, ArrowRight } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants/labels";
import type { EstadoOrden } from "@/types/ordenes";

type TipoReporte = "TORREY" | "FABATSA" | "REPARE";

interface ReportePreview {
  tipo: string;
  periodo: string;
  totalOrdenes: number;
  resumenEstados: { estado: EstadoOrden; cantidad: number }[];
}

const TIPOS_REPORTE: { value: TipoReporte; label: string; description: string }[] = [
  {
    value: "TORREY",
    label: "TORREY (Básculas)",
    description: "Reporte de servicio en garantía para básculas TORREY",
  },
  {
    value: "FABATSA",
    label: "FABATSA",
    description: "Reporte de garantías FABATSA (mismo formato que TORREY)",
  },
  {
    value: "REPARE",
    label: "REPARE (Refrigeración)",
    description: "Layout para servicios de refrigeración vía call center",
  },
];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function ReportesPage() {
  const currentDate = new Date();
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>("TORREY");
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [año, setAño] = useState(currentDate.getFullYear());
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<ReportePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generar años disponibles (últimos 5 años)
  const años = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setError(null);

    try {
      const response = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: tipoReporte, mes, año }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al obtener preview");
      }

      const data = await response.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const downloadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reportes?tipo=${tipoReporte}&mes=${mes}&año=${año}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al generar reporte");
      }

      // Obtener el nombre del archivo del header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `Reporte_${tipoReporte}_${MESES[mes - 1]}_${año}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600">
            Genera reportes mensuales para TORREY, FABATSA y REPARE
          </p>
        </div>
        <Link
          href="/reportes/avanzados"
          className="flex items-center gap-2 px-4 py-2 bg-[#31A7D4] text-white rounded-lg hover:bg-[#2890b8] transition-colors"
        >
          <BarChart3 className="w-5 h-5" />
          Reportes Avanzados
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de configuración */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tipo de reporte */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Tipo de Reporte
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIPOS_REPORTE.map((tipo) => (
                <button
                  key={tipo.value}
                  onClick={() => {
                    setTipoReporte(tipo.value);
                    setPreview(null);
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    tipoReporte === tipo.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">{tipo.label}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {tipo.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Período */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Período
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mes
                </label>
                <select
                  value={mes}
                  onChange={(e) => {
                    setMes(Number(e.target.value));
                    setPreview(null);
                  }}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {MESES.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año
                </label>
                <select
                  value={año}
                  onChange={(e) => {
                    setAño(Number(e.target.value));
                    setPreview(null);
                  }}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {años.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4">
            <button
              onClick={fetchPreview}
              disabled={loadingPreview}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {loadingPreview ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Filter className="h-5 w-5" />
              )}
              Ver Preview
            </button>

            <button
              onClick={downloadReport}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              Descargar Excel
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Panel de preview */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Preview
          </h2>

          {preview ? (
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {preview.totalOrdenes}
                </div>
                <div className="text-sm text-gray-500">
                  órdenes en {preview.periodo}
                </div>
              </div>

              {preview.totalOrdenes > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Por estado:
                  </h3>
                  <div className="space-y-2">
                    {preview.resumenEstados.map((item) => (
                      <div
                        key={item.estado}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-gray-600">
                          {STATUS_LABELS[item.estado] || item.estado}
                        </span>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.totalOrdenes === 0 && (
                <p className="text-center text-gray-500 text-sm">
                  No hay órdenes para este período
                </p>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Selecciona las opciones y haz clic en &quot;Ver Preview&quot;</p>
            </div>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Información de reportes</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>TORREY/FABATSA:</strong> Incluye órdenes de tipo GARANTÍA y CENTRO_SERVICIO
            con formato de formulario detallado.
          </li>
          <li>
            <strong>REPARE:</strong> Incluye órdenes de tipo REPARE en formato tabular
            compatible con el sistema de call center.
          </li>
          <li>
            Los reportes incluyen evidencias fotográficas como enlaces.
          </li>
        </ul>
      </div>
    </div>
  );
}
