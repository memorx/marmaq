"use client";

import { Button, Card } from "@/components/ui";
import { Package, Plus } from "lucide-react";
import type { OrdenConRelaciones } from "@/types/ordenes";

interface MaterialesCardProps {
  materialesUsados: OrdenConRelaciones["materialesUsados"];
}

export function MaterialesCard({ materialesUsados }: MaterialesCardProps) {
  return (
    <Card className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-500" />
          <h2 className="text-base lg:text-lg font-semibold text-[#092139]">Materiales Utilizados</h2>
        </div>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar</span>
        </Button>
      </div>

      {materialesUsados && materialesUsados.length > 0 ? (
        <>
          {/* Tabla en desktop */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                    Pieza
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                    Cantidad
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">
                    Precio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {materialesUsados.map((mu) => (
                  <tr key={mu.id}>
                    <td className="py-3">
                      <p className="font-medium text-gray-900">{mu.material.nombre}</p>
                      <p className="text-sm text-gray-500">{mu.material.sku}</p>
                    </td>
                    <td className="py-3 text-gray-700">{mu.cantidad}</td>
                    <td className="py-3 text-right text-gray-700">
                      {mu.precioUnitario
                        ? `$${Number(mu.precioUnitario).toFixed(2)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards en móvil */}
          <div className="md:hidden space-y-3">
            {materialesUsados.map((mu) => (
              <div
                key={mu.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">{mu.material.nombre}</p>
                  <p className="text-xs text-gray-500">{mu.material.sku}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-sm font-medium text-gray-900">×{mu.cantidad}</p>
                  <p className="text-xs text-gray-500">
                    {mu.precioUnitario
                      ? `$${Number(mu.precioUnitario).toFixed(2)}`
                      : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-6 lg:py-8 text-gray-500">
          <Package className="w-8 lg:w-10 h-8 lg:h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin materiales registrados</p>
        </div>
      )}
    </Card>
  );
}
