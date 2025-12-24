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
  Legend,
} from "recharts";
import { Users, Trophy, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui";

interface TecnicoData {
  tecnicoId: string;
  nombre: string;
  asignadas: number;
  completadas: number;
  pendientes: number;
  tiempoPromedioDias: number;
  eficiencia: number;
}

interface ReporteTecnicosProps {
  data: TecnicoData[];
  ranking: TecnicoData[];
  onExport: () => void;
}

export function ReporteTecnicos({ data, ranking, onExport }: ReporteTecnicosProps) {
  const chartData = data
    .filter((t) => t.asignadas > 0)
    .map((t) => ({
      nombre: t.nombre.split(" ")[0], // Solo primer nombre para la gráfica
      Completadas: t.completadas,
      Pendientes: t.pendientes,
    }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#31A7D4]" />
            <h3 className="text-base lg:text-lg font-semibold text-[#092139]">
              Reporte por Técnico
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-1" />
            Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gráfica de barras */}
        {chartData.length > 0 ? (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
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
                <Bar dataKey="Completadas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pendientes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-400">
            Sin datos de técnicos
          </div>
        )}

        {/* Ranking de eficiencia */}
        {ranking.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#092139] mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Ranking de Eficiencia
            </h4>
            <div className="space-y-2">
              {ranking.slice(0, 5).map((tecnico, index) => (
                <div
                  key={tecnico.tecnicoId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? "bg-yellow-400 text-yellow-900"
                          : index === 1
                          ? "bg-gray-300 text-gray-700"
                          : index === 2
                          ? "bg-orange-300 text-orange-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-medium text-[#092139]">{tecnico.nombre}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="text-gray-500">Eficiencia</p>
                      <p className="font-semibold text-[#31A7D4]">{tecnico.eficiencia}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">Tiempo prom.</p>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tecnico.tiempoPromedioDias} días
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabla detallada */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Técnico</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Asignadas</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Completadas</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Pendientes</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Tiempo Prom.</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Eficiencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((tecnico) => (
                <tr key={tecnico.tecnicoId} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{tecnico.nombre}</td>
                  <td className="px-3 py-2 text-center">{tecnico.asignadas}</td>
                  <td className="px-3 py-2 text-center text-green-600">{tecnico.completadas}</td>
                  <td className="px-3 py-2 text-center text-orange-600">{tecnico.pendientes}</td>
                  <td className="px-3 py-2 text-center">{tecnico.tiempoPromedioDias} días</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        tecnico.eficiencia >= 80
                          ? "bg-green-100 text-green-700"
                          : tecnico.eficiencia >= 50
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {tecnico.eficiencia}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
