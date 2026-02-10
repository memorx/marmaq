"use client";

import Image from "next/image";
import { Button, Card, Badge } from "@/components/ui";
import {
  Phone,
  Mail,
  User,
  Clock,
  Calendar,
  Wrench,
  PenLine,
} from "lucide-react";
import type { OrdenConRelaciones, EstadoOrden, SemaforoColor } from "@/types/ordenes";
import type { AccionEstado } from "@/lib/constants/orden-detail";
import { formatDate, formatDateTime, calcularTiempoTranscurrido } from "@/lib/constants/orden-detail";

interface OrdenInfoSidebarProps {
  orden: OrdenConRelaciones & { semaforo: SemaforoColor };
  acciones: AccionEstado[];
  onCambiarEstado: (estado: EstadoOrden) => void;
  updating: boolean;
  onFirmaModal: () => void;
}

export function OrdenInfoSidebar({
  orden,
  acciones,
  onCambiarEstado,
  updating,
  onFirmaModal,
}: OrdenInfoSidebarProps) {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* 1. Card Información */}
      <Card className="p-4 lg:p-6">
        <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Información</h2>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs lg:text-sm text-gray-500">Fecha Ingreso</p>
              <p className="font-medium text-gray-900 text-sm lg:text-base">
                {formatDate(orden.fechaRecepcion)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs lg:text-sm text-gray-500">Tiempo</p>
              <p className="font-medium text-gray-900 text-sm lg:text-base">
                {calcularTiempoTranscurrido(orden.fechaRecepcion)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs lg:text-sm text-gray-500">Técnico</p>
              <p className="font-medium text-gray-900 text-sm lg:text-base truncate">
                {orden.tecnico?.name || "Sin asignar"}
              </p>
            </div>
          </div>

          {orden.serieEquipo && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-mono text-gray-500">S/N</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs lg:text-sm text-gray-500">No. Serie</p>
                <p className="font-medium font-mono text-gray-900 text-sm truncate">
                  {orden.serieEquipo}
                </p>
              </div>
            </div>
          )}

          {orden.fechaPromesa && (
            <div className="flex items-center gap-3 col-span-2 lg:col-span-1">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs lg:text-sm text-gray-500">Fecha Promesa</p>
                <p className="font-medium text-orange-600 text-sm lg:text-base">
                  {formatDate(orden.fechaPromesa)}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Card Cliente - con enlaces touch-friendly */}
      <Card className="p-4 lg:p-6">
        <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Cliente</h2>
        <div className="space-y-3 lg:space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#31A7D4]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-[#31A7D4]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 text-sm lg:text-base">{orden.cliente.nombre}</p>
              {orden.cliente.empresa && (
                <p className="text-xs lg:text-sm text-gray-500 truncate">{orden.cliente.empresa}</p>
              )}
            </div>
          </div>

          {/* Teléfono - botón grande y tappable */}
          <a
            href={`tel:${orden.cliente.telefono}`}
            className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs lg:text-sm text-gray-500">Teléfono</p>
              <p className="font-medium text-[#31A7D4] text-sm lg:text-base">
                {orden.cliente.telefono}
              </p>
            </div>
          </a>

          {orden.cliente.email && (
            <a
              href={`mailto:${orden.cliente.email}`}
              className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm text-gray-500">Email</p>
                <p className="font-medium text-[#31A7D4] text-sm lg:text-base truncate">
                  {orden.cliente.email}
                </p>
              </div>
            </a>
          )}

          {orden.cliente.esDistribuidor && (
            <Badge variant="centro">Distribuidor</Badge>
          )}
        </div>
      </Card>

      {/* 3. Card Acciones Rápidas - Solo visible en desktop (móvil lo ve arriba) */}
      {acciones.length > 0 && (
        <Card className="hidden lg:block p-6 border-2 border-[#31A7D4]/20 bg-[#31A7D4]/5">
          <h2 className="text-lg font-semibold text-[#092139] mb-4">Acciones</h2>
          <div className="space-y-3">
            {acciones.map((accion) => (
              <Button
                key={accion.nuevoEstado}
                variant={accion.variant}
                className="w-full"
                onClick={() => onCambiarEstado(accion.nuevoEstado)}
                isLoading={updating}
              >
                {accion.label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Cotización (si aplica) */}
      {orden.tipoServicio === "POR_COBRAR" && orden.cotizacion && (
        <Card className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Cotización</h2>
          <div className="text-center">
            <p className="text-2xl lg:text-3xl font-bold text-[#092139]">
              ${Number(orden.cotizacion).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
            <Badge
              variant={orden.cotizacionAprobada ? "success" : "warning"}
              className="mt-2"
            >
              {orden.cotizacionAprobada ? "Aprobada" : "Pendiente"}
            </Badge>
          </div>
        </Card>
      )}

      {/* Firma del Cliente */}
      <Card className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-base lg:text-lg font-semibold text-[#092139]">Firma del Cliente</h2>
          {!orden.firmaClienteUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={onFirmaModal}
              className="flex items-center gap-1"
            >
              <PenLine className="w-4 h-4" />
              <span className="hidden sm:inline">Capturar</span>
            </Button>
          )}
        </div>

        {orden.firmaClienteUrl ? (
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 relative h-32">
              <Image
                src={orden.firmaClienteUrl}
                alt="Firma del cliente"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Firmado el {orden.firmaFecha ? formatDateTime(orden.firmaFecha) : "—"}
            </p>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <PenLine className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin firma registrada</p>
            <p className="text-xs text-gray-400 mt-1">
              La firma se solicitará al entregar el equipo
            </p>
          </div>
        )}
      </Card>

      {/* Info adicional para Garantía */}
      {orden.tipoServicio === "GARANTIA" && orden.numeroFactura && (
        <Card className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Datos de Garantía</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">No. Factura:</span>
              <span className="font-medium text-right">{orden.numeroFactura}</span>
            </div>
            {orden.fechaFactura && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Fecha Factura:</span>
                <span className="font-medium">{formatDate(orden.fechaFactura)}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Info adicional para REPARE */}
      {orden.tipoServicio === "REPARE" && orden.numeroRepare && (
        <Card className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-semibold text-[#092139] mb-3 lg:mb-4">Datos REPARE</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">No. REPARE:</span>
              <span className="font-medium font-mono text-right">{orden.numeroRepare}</span>
            </div>
            {orden.coordenadasGPS && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-gray-500">GPS:</span>
                <span className="font-medium font-mono text-xs break-all">
                  {orden.coordenadasGPS}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
