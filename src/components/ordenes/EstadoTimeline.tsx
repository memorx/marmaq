"use client";

import { Card } from "@/components/ui";
import { CheckCircle2, Circle } from "lucide-react";
import type { EstadoOrden } from "@/types/ordenes";
import { ESTADO_ORDEN, TIMELINE_ESTADOS } from "@/lib/constants/orden-detail";

interface EstadoTimelineProps {
  estadoActual: EstadoOrden;
}

export function EstadoTimeline({ estadoActual }: EstadoTimelineProps) {
  const estadoActualIndex = ESTADO_ORDEN.indexOf(estadoActual);

  return (
    <Card className="p-4 lg:p-6">
      <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-4 lg:mb-6">Estado del Servicio</h2>
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="relative min-w-[500px] lg:min-w-0">
          {/* Línea de conexión */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-green-500 transition-all duration-500"
            style={{
              width: `${(estadoActualIndex / (TIMELINE_ESTADOS.length - 1)) * 100}%`,
            }}
          />

          {/* Estados */}
          <div className="relative flex justify-between">
            {TIMELINE_ESTADOS.map((item) => {
              const itemIndex = ESTADO_ORDEN.indexOf(item.estado as EstadoOrden);
              const isCompleted = itemIndex < estadoActualIndex;
              const isCurrent = item.estado === estadoActual;

              return (
                <div key={item.estado} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-orange-500 text-white ring-4 ring-orange-100"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center max-w-[60px] lg:max-w-none ${
                      isCurrent
                        ? "font-semibold text-orange-600"
                        : isCompleted
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
