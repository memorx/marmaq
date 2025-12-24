"use client";

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
import { Card, CardHeader, CardContent } from "@/components/ui";

interface EstadoData {
  estado: string;
  estadoKey: string;
  cantidad: number;
}

interface EstadoOrdenesChartProps {
  data: EstadoData[];
}

// Colores por estado
const COLORS: Record<string, string> = {
  RECIBIDO: "#3B82F6", // Azul
  EN_DIAGNOSTICO: "#8B5CF6", // Violeta
  COTIZACION_PENDIENTE: "#EC4899", // Rosa
  EN_REPARACION: "#F59E0B", // Amarillo
  ESPERA_REFACCIONES: "#EF4444", // Rojo
  REPARADO: "#10B981", // Verde
  LISTO_ENTREGA: "#06B6D4", // Cyan
};

export function EstadoOrdenesChart({ data }: EstadoOrdenesChartProps) {
  // Ordenar por cantidad descendente
  const sortedData = [...data].sort((a, b) => b.cantidad - a.cantidad);

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm lg:text-base font-semibold text-[#092139]">
          Órdenes por Estado
        </h3>
        <p className="text-xs text-gray-500">Órdenes activas actuales</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] lg:h-[250px]">
          {sortedData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Sin órdenes activas
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB" }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="estado"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [value ?? 0, "Órdenes"]}
                />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={25}>
                  {sortedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.estadoKey] || "#6B7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
