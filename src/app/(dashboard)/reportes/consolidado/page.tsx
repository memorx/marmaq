"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Badge } from "@/components/ui";
import {
  ArrowLeft,
  Download,
  Printer,
  Loader2,
  Package,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import { SEMAFORO_CONFIG } from "@/types/ordenes";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface ConsolidadoData {
  periodo: { mes: string; anio: number; label: string };
  resumen: {
    totalOrdenes: number;
    entregadas: number;
    canceladas: number;
    enProceso: number;
    ingresosTotales: number;
  };
  porTipoServicio: {
    tipo: string;
    tipoLabel: string;
    cantidad: number;
    ingresos: number;
  }[];
  porTecnico: {
    tecnicoId: string;
    nombre: string;
    asignadas: number;
    completadas: number;
    tiempoPromedioDias: number;
  }[];
  porEstado: {
    estado: string;
    estadoLabel: string;
    cantidad: number;
  }[];
  semaforo: {
    rojo: number;
    naranja: number;
    amarillo: number;
    verde: number;
    azul: number;
  };
  ordenesCriticas: {
    id: string;
    folio: string;
    cliente: string;
    equipo: string;
    diasEnTaller: number;
    estado: string;
  }[];
}

export default function ConsolidadoPage() {
  const currentDate = new Date();
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [año, setAño] = useState(currentDate.getFullYear());
  const [data, setData] = useState<ConsolidadoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const años = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mesStr = `${año}-${String(mes).padStart(2, "0")}`;
      const res = await fetch(`/api/reportes/consolidado?mes=${mesStr}`);

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Error al cargar datos");
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [mes, año]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const response = await fetch(
        `/api/reportes?tipo=GENERAL&mes=${mes}&año=${año}`
      );

      if (!response.ok) {
        throw new Error("Error al generar reporte");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `Reporte_GENERAL_${MESES[mes - 1]}_${año}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

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
      alert(err instanceof Error ? err.message : "Error al descargar");
    } finally {
      setDownloading(false);
    }
  };

  const semaforoTotal = data
    ? data.semaforo.rojo + data.semaforo.naranja + data.semaforo.amarillo + data.semaforo.verde + data.semaforo.azul
    : 0;

  const topTecnico = data?.porTecnico.reduce<ConsolidadoData["porTecnico"][number] | null>(
    (best, t) => (!best || t.completadas > best.completadas ? t : best),
    null
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 print:gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/reportes"
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors print:hidden"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#092139]">
              Reporte Consolidado Mensual
            </h1>
            <p className="text-gray-500 text-sm print:hidden">
              Resumen ejecutivo de órdenes del mes
            </p>
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#31A7D4] focus:border-[#31A7D4]"
          >
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={año}
            onChange={(e) => setAño(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#31A7D4] focus:border-[#31A7D4]"
          >
            {años.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            onClick={handleDownloadExcel}
            disabled={downloading || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>

        {/* Print header */}
        <div className="hidden print:block text-center mb-4">
          <p className="text-lg font-semibold">{data?.periodo.label}</p>
        </div>
      </div>

      {/* LOADING / ERROR */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#31A7D4]" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* RESUMEN CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
            <Card className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Total Órdenes</p>
                  <p className="text-2xl font-bold text-[#092139]">{data.resumen.totalOrdenes}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Entregadas</p>
                  <p className="text-2xl font-bold text-green-600">{data.resumen.entregadas}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">En Proceso</p>
                  <p className="text-2xl font-bold text-orange-600">{data.resumen.enProceso}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Ingresos</p>
                  <p className="text-xl lg:text-2xl font-bold text-emerald-600">
                    ${data.resumen.ingresosTotales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* SEMÁFORO BAR */}
          {semaforoTotal > 0 && (
            <Card className="p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-4">
                Estado de Alertas
              </h2>
              {/* Horizontal bar */}
              <div className="h-6 rounded-full overflow-hidden flex">
                {([
                  { key: "rojo" as const, color: SEMAFORO_CONFIG.ROJO.color },
                  { key: "naranja" as const, color: SEMAFORO_CONFIG.NARANJA.color },
                  { key: "amarillo" as const, color: SEMAFORO_CONFIG.AMARILLO.color },
                  { key: "verde" as const, color: SEMAFORO_CONFIG.VERDE.color },
                  { key: "azul" as const, color: SEMAFORO_CONFIG.AZUL.color },
                ]).map(({ key, color }) => {
                  const count = data.semaforo[key];
                  if (count === 0) return null;
                  const pct = (count / semaforoTotal) * 100;
                  return (
                    <div
                      key={key}
                      style={{ width: `${pct}%`, backgroundColor: color }}
                      className="transition-all duration-300"
                      title={`${SEMAFORO_CONFIG[key.toUpperCase() as keyof typeof SEMAFORO_CONFIG].label}: ${count}`}
                    />
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-3">
                {([
                  { key: "rojo" as const, config: SEMAFORO_CONFIG.ROJO },
                  { key: "naranja" as const, config: SEMAFORO_CONFIG.NARANJA },
                  { key: "amarillo" as const, config: SEMAFORO_CONFIG.AMARILLO },
                  { key: "verde" as const, config: SEMAFORO_CONFIG.VERDE },
                  { key: "azul" as const, config: SEMAFORO_CONFIG.AZUL },
                ]).map(({ key, config }) => (
                  <div key={key} className="flex items-center gap-1.5 text-sm">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-gray-600">{config.label}:</span>
                    <span className="font-semibold">{data.semaforo[key]}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* POR TIPO DE SERVICIO */}
          <Card className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-4">
              Por Tipo de Servicio
            </h2>

            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">Tipo</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Cantidad</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Ingresos</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.porTipoServicio.map((item) => (
                    <tr key={item.tipo}>
                      <td className="py-3 font-medium text-gray-900">{item.tipoLabel}</td>
                      <td className="py-3 text-right text-gray-700">{item.cantidad}</td>
                      <td className="py-3 text-right text-gray-700">
                        {item.ingresos > 0
                          ? `$${item.ingresos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="py-3 text-right text-gray-700">
                        {data.resumen.totalOrdenes > 0
                          ? `${Math.round((item.cantidad / data.resumen.totalOrdenes) * 100)}%`
                          : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-semibold">
                    <td className="py-3 text-gray-900">Total</td>
                    <td className="py-3 text-right text-gray-900">{data.resumen.totalOrdenes}</td>
                    <td className="py-3 text-right text-gray-900">
                      ${data.resumen.ingresosTotales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right text-gray-900">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {data.porTipoServicio.map((item) => (
                <div key={item.tipo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm">{item.tipoLabel}</p>
                    <p className="text-xs text-gray-500">
                      {data.resumen.totalOrdenes > 0
                        ? `${Math.round((item.cantidad / data.resumen.totalOrdenes) * 100)}% del total`
                        : "0%"}
                    </p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">{item.cantidad} órdenes</p>
                    {item.ingresos > 0 && (
                      <p className="text-xs text-green-600">
                        ${item.ingresos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* POR TÉCNICO */}
          {data.porTecnico.length > 0 && (
            <Card className="p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-4">
                Por Técnico
              </h2>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">Técnico</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Asignadas</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Completadas</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Tiempo Prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.porTecnico
                      .filter((t) => t.asignadas > 0)
                      .sort((a, b) => b.completadas - a.completadas)
                      .map((tecnico) => (
                        <tr key={tecnico.tecnicoId}>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{tecnico.nombre}</span>
                              {topTecnico && tecnico.tecnicoId === topTecnico.tecnicoId && topTecnico.completadas > 0 && (
                                <Badge variant="success" className="flex items-center gap-1">
                                  <Trophy className="w-3 h-3" />
                                  Top
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-right text-gray-700">{tecnico.asignadas}</td>
                          <td className="py-3 text-right text-gray-700">{tecnico.completadas}</td>
                          <td className="py-3 text-right text-gray-700">
                            {tecnico.tiempoPromedioDias > 0 ? `${tecnico.tiempoPromedioDias} días` : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {data.porTecnico
                  .filter((t) => t.asignadas > 0)
                  .sort((a, b) => b.completadas - a.completadas)
                  .map((tecnico) => (
                    <div key={tecnico.tecnicoId} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900 text-sm">{tecnico.nombre}</span>
                        {topTecnico && tecnico.tecnicoId === topTecnico.tecnicoId && topTecnico.completadas > 0 && (
                          <Badge variant="success" className="flex items-center gap-1 text-xs">
                            <Trophy className="w-3 h-3" />
                            Top
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-gray-500">Asignadas</p>
                          <p className="font-semibold text-sm">{tecnico.asignadas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Completadas</p>
                          <p className="font-semibold text-sm text-green-600">{tecnico.completadas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tiempo</p>
                          <p className="font-semibold text-sm">
                            {tecnico.tiempoPromedioDias > 0 ? `${tecnico.tiempoPromedioDias}d` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* POR ESTADO */}
          {data.porEstado.length > 0 && (
            <Card className="p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-4">
                Distribución por Estado
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.porEstado
                  .sort((a, b) => b.cantidad - a.cantidad)
                  .map((item) => (
                    <div key={item.estado} className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-[#092139]">{item.cantidad}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.estadoLabel}</p>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* ÓRDENES CRÍTICAS */}
          {data.ordenesCriticas.length > 0 && (
            <Card className="p-4 lg:p-6 border-2 border-red-200 bg-red-50/30">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h2 className="text-base lg:text-lg font-semibold text-red-900">
                  Órdenes Críticas ({data.ordenesCriticas.length})
                </h2>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-red-200">
                      <th className="text-left text-xs font-medium text-red-600 uppercase py-3">Folio</th>
                      <th className="text-left text-xs font-medium text-red-600 uppercase py-3">Cliente</th>
                      <th className="text-left text-xs font-medium text-red-600 uppercase py-3">Equipo</th>
                      <th className="text-right text-xs font-medium text-red-600 uppercase py-3">Días</th>
                      <th className="text-left text-xs font-medium text-red-600 uppercase py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {data.ordenesCriticas.map((o) => (
                      <tr key={o.id}>
                        <td className="py-3">
                          <Link
                            href={`/ordenes/${o.id}`}
                            className="font-medium font-mono text-[#31A7D4] hover:underline"
                          >
                            {o.folio}
                          </Link>
                        </td>
                        <td className="py-3 text-gray-700">{o.cliente}</td>
                        <td className="py-3 text-gray-700">{o.equipo}</td>
                        <td className="py-3 text-right font-semibold text-red-600">{o.diasEnTaller}</td>
                        <td className="py-3 text-gray-700">{o.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {data.ordenesCriticas.map((o) => (
                  <div key={o.id} className="p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/ordenes/${o.id}`}
                        className="font-medium font-mono text-[#31A7D4] hover:underline text-sm"
                      >
                        {o.folio}
                      </Link>
                      <span className="text-sm font-semibold text-red-600">{o.diasEnTaller} días</span>
                    </div>
                    <p className="text-sm text-gray-900">{o.cliente}</p>
                    <p className="text-xs text-gray-500">{o.equipo} &middot; {o.estado}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Empty state */}
          {data.resumen.totalOrdenes === 0 && (
            <Card className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No hay órdenes para {data.periodo.label}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
