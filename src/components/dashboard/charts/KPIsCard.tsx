"use client";

import { Card, CardHeader, CardContent } from "@/components/ui";
import { TrendingUp, TrendingDown, Clock, CheckCircle, User } from "lucide-react";

interface KPIsData {
  tiempoPromedioReparacion: number;
  completadasEsteMes: number;
  completadasMesAnterior: number;
  tendenciaCompletadas: number;
  tecnicoTop: { nombre: string; ordenes: number } | null;
}

interface KPIsCardProps {
  data: KPIsData;
}

export function KPIsCard({ data }: KPIsCardProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm lg:text-base font-semibold text-[#092139]">
          Indicadores Clave
        </h3>
        <p className="text-xs text-gray-500">Rendimiento del taller</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tiempo promedio de reparación */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Tiempo promedio reparación</p>
            <p className="text-lg font-bold text-[#092139]">
              {data.tiempoPromedioReparacion} días
            </p>
          </div>
        </div>

        {/* Órdenes completadas este mes */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Completadas este mes</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-[#092139]">
                {data.completadasEsteMes}
              </p>
              {data.tendenciaCompletadas !== 0 && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    data.tendenciaCompletadas > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {data.tendenciaCompletadas > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {data.tendenciaCompletadas > 0 ? "+" : ""}
                    {data.tendenciaCompletadas}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">
              vs {data.completadasMesAnterior} mes anterior
            </p>
          </div>
        </div>

        {/* Técnico con más órdenes */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Técnico destacado del mes</p>
            {data.tecnicoTop ? (
              <>
                <p className="text-sm font-semibold text-[#092139] truncate">
                  {data.tecnicoTop.nombre}
                </p>
                <p className="text-xs text-gray-400">
                  {data.tecnicoTop.ordenes} órdenes completadas
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Sin datos este mes</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
