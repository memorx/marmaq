"use client";

import { Card, CardHeader, CardContent } from "@/components/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Clock, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui";
import Link from "next/link";

interface TiempoPorEstado {
  estado: string;
  estadoLabel: string;
  cantidad: number;
  tiempoPromedioDias: number;
}

interface OrdenExcedida {
  id: string;
  folio: string;
  estado: string;
  estadoLabel: string;
  cliente: string;
  tecnico: string;
  diasTranscurridos: number;
  fechaRecepcion: string;
}

interface CuelloDeBottella {
  estado: string;
  estadoLabel: string;
  cantidad: number;
  tiempoPromedioDias: number;
}

interface ReporteTiemposProps {
  tiemposPorEstado: TiempoPorEstado[];
  ordenesExcedidas: OrdenExcedida[];
  cuellosDeBottella: CuelloDeBottella[];
  onExport: () => void;
}

const ESTADO_COLORS: Record<string, string> = {
  RECIBIDO: "#3B82F6",
  EN_DIAGNOSTICO: "#8B5CF6",
  COTIZACION_PENDIENTE: "#EC4899",
  EN_REPARACION: "#F59E0B",
  ESPERA_REFACCIONES: "#EF4444",
  REPARADO: "#10B981",
  LISTO_ENTREGA: "#06B6D4",
};

export function ReporteTiempos({
  tiemposPorEstado,
  ordenesExcedidas,
  cuellosDeBottella,
  onExport,
}: ReporteTiemposProps) {
  const chartData = tiemposPorEstado
    .filter((e) => e.cantidad > 0)
    .map((e) => ({
      estado: e.estadoLabel.length > 12 ? e.estadoLabel.substring(0, 12) + "..." : e.estadoLabel,
      estadoKey: e.estado,
      dias: e.tiempoPromedioDias,
      cantidad: e.cantidad,
    }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#31A7D4]" />
            <h3 className="text-base lg:text-lg font-semibold text-[#092139]">
              Reporte de Tiempos
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-1" />
            Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cuellos de botella */}
        {cuellosDeBottella.length > 0 && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Cuellos de Botella Identificados
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {cuellosDeBottella.map((cuello, index) => (
                <div
                  key={cuello.estado}
                  className="p-3 bg-white rounded-lg border border-red-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-[#092139] text-sm">
                      {cuello.estadoLabel}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{cuello.cantidad} órdenes</span>
                    <span className="text-red-600 font-medium">
                      {cuello.tiempoPromedioDias} días prom.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gráfica de tiempo por estado */}
        {chartData.length > 0 ? (
          <div>
            <h4 className="text-sm font-semibold text-[#092139] mb-3">
              Tiempo Promedio en Cada Estado
            </h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#E5E7EB" }}
                    unit=" días"
                  />
                  <YAxis
                    type="category"
                    dataKey="estado"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [`${value ?? 0} días`, "Tiempo promedio"]}
                  />
                  <Bar dataKey="dias" radius={[0, 4, 4, 0]} maxBarSize={25}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ESTADO_COLORS[entry.estadoKey] || "#6B7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-400">
            Sin órdenes activas
          </div>
        )}

        {/* Tabla de tiempos */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Estado</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Órdenes</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Tiempo Prom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiemposPorEstado.map((item) => (
                <tr key={item.estado} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: (ESTADO_COLORS[item.estado] || "#6B7280") + "20",
                        color: ESTADO_COLORS[item.estado] || "#6B7280",
                      }}
                    >
                      {item.estadoLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">{item.cantidad}</td>
                  <td className="px-3 py-2 text-center">
                    {item.cantidad > 0 ? (
                      <span
                        className={`font-medium ${
                          item.tiempoPromedioDias > 5
                            ? "text-red-600"
                            : item.tiempoPromedioDias > 3
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {item.tiempoPromedioDias} días
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Órdenes que exceden tiempo */}
        {ordenesExcedidas.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#092139] mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Órdenes que Exceden 7 Días ({ordenesExcedidas.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-orange-700">Folio</th>
                    <th className="text-left px-3 py-2 font-medium text-orange-700">Cliente</th>
                    <th className="text-left px-3 py-2 font-medium text-orange-700">Técnico</th>
                    <th className="text-left px-3 py-2 font-medium text-orange-700">Estado</th>
                    <th className="text-center px-3 py-2 font-medium text-orange-700">Días</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100">
                  {ordenesExcedidas.map((orden) => (
                    <tr key={orden.id} className="hover:bg-orange-50/50">
                      <td className="px-3 py-2">
                        <Link
                          href={`/ordenes/${orden.id}`}
                          className="text-[#31A7D4] hover:underline font-medium"
                        >
                          {orden.folio}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{orden.cliente}</td>
                      <td className="px-3 py-2 text-gray-600">{orden.tecnico}</td>
                      <td className="px-3 py-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: (ESTADO_COLORS[orden.estado] || "#6B7280") + "20",
                            color: ESTADO_COLORS[orden.estado] || "#6B7280",
                          }}
                        >
                          {orden.estadoLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`font-bold ${
                            orden.diasTranscurridos > 14
                              ? "text-red-600"
                              : orden.diasTranscurridos > 10
                              ? "text-orange-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {orden.diasTranscurridos}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
