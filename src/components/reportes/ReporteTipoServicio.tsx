"use client";

import { Card, CardHeader, CardContent } from "@/components/ui";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Layers, DollarSign, Download, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui";

interface TipoServicioData {
  tipo: string;
  tipoLabel: string;
  cantidad: number;
  ingresos: number;
  cotizacionesEnviadas: number;
  cotizacionesAprobadas: number;
  cotizacionesRechazadas: number;
  tasaRechazo: number;
}

interface PorMesData {
  mes: string;
  GARANTIA: number;
  CENTRO_SERVICIO: number;
  POR_COBRAR: number;
  REPARE: number;
}

interface ReporteTipoServicioProps {
  data: TipoServicioData[];
  porMes: PorMesData[];
  onExport: () => void;
}

const COLORS: Record<string, string> = {
  GARANTIA: "#10B981",
  CENTRO_SERVICIO: "#6366F1",
  POR_COBRAR: "#F59E0B",
  REPARE: "#EF4444",
};

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
}

export function ReporteTipoServicio({ data, porMes, onExport }: ReporteTipoServicioProps) {
  const totalIngresos = data.reduce((acc, d) => acc + d.ingresos, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#31A7D4]" />
            <h3 className="text-base lg:text-lg font-semibold text-[#092139]">
              Reporte por Tipo de Servicio
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-1" />
            Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cards de resumen */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {data.map((item) => (
            <div
              key={item.tipo}
              className="p-3 rounded-lg border"
              style={{ borderColor: COLORS[item.tipo] + "40" }}
            >
              <p className="text-xs text-gray-500">{item.tipoLabel}</p>
              <p className="text-xl font-bold" style={{ color: COLORS[item.tipo] }}>
                {item.cantidad}
              </p>
              {item.tipo === "POR_COBRAR" && item.ingresos > 0 && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <DollarSign className="w-3 h-3" />
                  {formatCurrency(item.ingresos)}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Ingresos totales */}
        {totalIngresos > 0 && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-green-700">Ingresos Totales (Por Cobrar)</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalIngresos)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Gráfica por mes */}
        {porMes.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#092139] mb-3">Tendencia por Mes</h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={porMes} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="GARANTIA"
                    name="Garantía"
                    stroke={COLORS.GARANTIA}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="CENTRO_SERVICIO"
                    name="Centro Servicio"
                    stroke={COLORS.CENTRO_SERVICIO}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="POR_COBRAR"
                    name="Por Cobrar"
                    stroke={COLORS.POR_COBRAR}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="REPARE"
                    name="REPARE"
                    stroke={COLORS.REPARE}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tasa de rechazo de cotizaciones */}
        <div>
          <h4 className="text-sm font-semibold text-[#092139] mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            Tasa de Rechazo de Cotizaciones
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Enviadas</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Aprobadas</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Rechazadas</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Tasa Rechazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data
                  .filter((d) => d.cotizacionesEnviadas > 0)
                  .map((item) => (
                    <tr key={item.tipo} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: COLORS[item.tipo] + "20",
                            color: COLORS[item.tipo],
                          }}
                        >
                          {item.tipoLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{item.cotizacionesEnviadas}</td>
                      <td className="px-3 py-2 text-center text-green-600">
                        {item.cotizacionesAprobadas}
                      </td>
                      <td className="px-3 py-2 text-center text-red-600">
                        {item.cotizacionesRechazadas}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.tasaRechazo <= 20
                              ? "bg-green-100 text-green-700"
                              : item.tasaRechazo <= 40
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.tasaRechazo}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
