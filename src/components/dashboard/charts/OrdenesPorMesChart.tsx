"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui";

interface OrdenesPorMesData {
  mes: string;
  cantidad: number;
}

interface OrdenesPorMesChartProps {
  data: OrdenesPorMesData[];
}

export function OrdenesPorMesChart({ data }: OrdenesPorMesChartProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm lg:text-base font-semibold text-[#092139]">
          Órdenes por Mes
        </h3>
        <p className="text-xs text-gray-500">Últimos 6 meses</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] lg:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
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
                formatter={(value) => [value ?? 0, "Órdenes"]}
              />
              <Bar
                dataKey="cantidad"
                fill="#31A7D4"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
