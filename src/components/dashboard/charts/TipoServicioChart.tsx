"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui";

interface TipoServicioData {
  tipo: string;
  tipoKey: string;
  cantidad: number;
}

interface TipoServicioChartProps {
  data: TipoServicioData[];
}

// Colores por tipo de servicio
const COLORS: Record<string, string> = {
  GARANTIA: "#10B981", // Verde
  CENTRO_SERVICIO: "#6366F1", // Índigo
  POR_COBRAR: "#F59E0B", // Amarillo
  REPARE: "#EF4444", // Rojo
};

export function TipoServicioChart({ data }: TipoServicioChartProps) {
  const total = data.reduce((acc, item) => acc + item.cantidad, 0);

  // Transformar data para recharts (necesita name para el Legend)
  const chartData = data.map((item) => ({
    name: item.tipo,
    tipoKey: item.tipoKey,
    cantidad: item.cantidad,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (!percent || percent < 0.05) return null; // No mostrar label si es menor al 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm lg:text-base font-semibold text-[#092139]">
          Por Tipo de Servicio
        </h3>
        <p className="text-xs text-gray-500">Distribución de órdenes</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] lg:h-[250px]">
          {total === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Sin datos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="cantidad"
                  nameKey="name"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.tipoKey] || "#6B7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [value ?? 0, "Órdenes"]}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
