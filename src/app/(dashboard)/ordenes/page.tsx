"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, Badge } from "@/components/ui";
import { MARMAQ_COLORS } from "@/lib/constants/colors";
import {
  SEMAFORO_CONFIG,
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  type OrdenListItem,
  type OrdenesListResponse,
  type SemaforoColor,
  type TipoServicio,
  type EstadoOrden,
} from "@/types/ordenes";
import { Plus, Search, Eye, ChevronLeft, ChevronRight, Filter } from "lucide-react";

const TIPO_SERVICIO_OPTIONS: { value: TipoServicio | ""; label: string }[] = [
  { value: "", label: "Todos los tipos" },
  { value: "GARANTIA", label: "Garantía" },
  { value: "CENTRO_SERVICIO", label: "Centro Servicio" },
  { value: "POR_COBRAR", label: "Por Cobrar" },
  { value: "REPARE", label: "REPARE" },
];

const ESTADO_OPTIONS: { value: EstadoOrden | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "RECIBIDO", label: "Recibido" },
  { value: "EN_DIAGNOSTICO", label: "En Diagnóstico" },
  { value: "ESPERA_REFACCIONES", label: "Espera Refacciones" },
  { value: "COTIZACION_PENDIENTE", label: "Cotización Pendiente" },
  { value: "EN_REPARACION", label: "En Reparación" },
  { value: "REPARADO", label: "Reparado" },
  { value: "LISTO_ENTREGA", label: "Listo para Entrega" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const SEMAFORO_OPTIONS: { value: SemaforoColor | ""; label: string; color: string }[] = [
  { value: "", label: "Todos", color: "transparent" },
  { value: "ROJO", label: "Crítico", color: MARMAQ_COLORS.semaforo.rojo },
  { value: "NARANJA", label: "Esperando", color: MARMAQ_COLORS.semaforo.naranja },
  { value: "AMARILLO", label: "Atención", color: MARMAQ_COLORS.semaforo.amarillo },
  { value: "AZUL", label: "Nuevo", color: MARMAQ_COLORS.semaforo.azul },
  { value: "VERDE", label: "Normal", color: MARMAQ_COLORS.semaforo.verde },
];

function SemaforoDot({ color }: { color: SemaforoColor }) {
  const config = SEMAFORO_CONFIG[color];
  return (
    <div
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: config.color }}
      title={config.description}
    />
  );
}

function getBadgeVariant(tipo: TipoServicio): "garantia" | "centro" | "cobrar" | "repare" {
  const map: Record<TipoServicio, "garantia" | "centro" | "cobrar" | "repare"> = {
    GARANTIA: "garantia",
    CENTRO_SERVICIO: "centro",
    POR_COBRAR: "cobrar",
    REPARE: "repare",
  };
  return map[tipo];
}

function getStatusBadgeVariant(estado: EstadoOrden): "default" | "success" | "warning" | "danger" | "info" {
  const map: Record<EstadoOrden, "default" | "success" | "warning" | "danger" | "info"> = {
    RECIBIDO: "info",
    EN_DIAGNOSTICO: "warning",
    ESPERA_REFACCIONES: "warning",
    COTIZACION_PENDIENTE: "warning",
    EN_REPARACION: "info",
    REPARADO: "success",
    LISTO_ENTREGA: "success",
    ENTREGADO: "default",
    CANCELADO: "danger",
  };
  return map[estado];
}

export default function OrdenesPage() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<OrdenListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [tipoServicio, setTipoServicio] = useState<TipoServicio | "">("");
  const [estado, setEstado] = useState<EstadoOrden | "">("");
  const [semaforo, setSemaforo] = useState<SemaforoColor | "">("");

  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      if (search) params.set("search", search);
      if (tipoServicio) params.set("tipoServicio", tipoServicio);
      if (estado) params.set("estado", estado);
      if (semaforo) params.set("semaforo", semaforo);

      const response = await fetch(`/api/ordenes?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al cargar órdenes");
      }

      const data: OrdenesListResponse = await response.json();
      setOrdenes(data.ordenes);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, search, tipoServicio, estado, semaforo]);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRowClick = (id: string) => {
    router.push(`/ordenes/${id}`);
  };

  const handleNewOrder = () => {
    router.push("/ordenes/nueva");
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header - Mobile optimizado */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-[#092139]">Órdenes de Servicio</h1>
          <p className="text-gray-500 text-xs lg:text-sm mt-0.5">
            {total} {total === 1 ? "orden" : "órdenes"}
          </p>
        </div>
        <Button onClick={handleNewOrder} size="sm" className="flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva Orden</span>
          <span className="sm:hidden">Nueva</span>
        </Button>
      </div>

      {/* Filtros - Stack en móvil, row en desktop */}
      <Card className="p-3 lg:p-4">
        <div className="space-y-3 lg:space-y-0 lg:flex lg:flex-row lg:gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar folio, cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 py-3 lg:py-2"
            />
          </div>

          {/* Fila de selects en móvil */}
          <div className="flex gap-2 lg:gap-4">
            {/* Tipo de Servicio */}
            <select
              value={tipoServicio}
              onChange={(e) => {
                setTipoServicio(e.target.value as TipoServicio | "");
                setPage(1);
              }}
              className="flex-1 lg:flex-none px-3 lg:px-4 py-3 lg:py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
            >
              {TIPO_SERVICIO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Estado */}
            <select
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value as EstadoOrden | "");
                setPage(1);
              }}
              className="flex-1 lg:flex-none px-3 lg:px-4 py-3 lg:py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
            >
              {ESTADO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Semáforo - scroll horizontal en móvil */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-3 px-3 lg:mx-0 lg:px-0">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex gap-1">
              {SEMAFORO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSemaforo(opt.value);
                    setPage(1);
                  }}
                  className={`w-9 h-9 lg:w-8 lg:h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 active:scale-95 ${
                    semaforo === opt.value
                      ? "border-[#092139] scale-110"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  title={opt.label}
                >
                  {opt.value ? (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                  ) : (
                    <span className="text-xs text-gray-500">All</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de órdenes */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31A7D4]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-red-500">
            <p>{error}</p>
            <Button variant="outline" onClick={fetchOrdenes} className="mt-4">
              Reintentar
            </Button>
          </div>
        ) : ordenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p>No se encontraron órdenes</p>
            {(search || tipoServicio || estado || semaforo) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setTipoServicio("");
                  setEstado("");
                  setSemaforo("");
                }}
                className="mt-2"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Tabla en desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">

                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Folio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Equipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Técnico
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ordenes.map((orden) => (
                    <tr
                      key={orden.id}
                      onClick={() => handleRowClick(orden.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4">
                        <SemaforoDot color={orden.semaforo} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono font-medium text-[#092139]">
                          {orden.folio}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {orden.cliente.nombre}
                          </p>
                          {orden.cliente.empresa && (
                            <p className="text-sm text-gray-500">
                              {orden.cliente.empresa}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-gray-900">
                            {orden.marcaEquipo} {orden.modeloEquipo}
                          </p>
                          {orden.serieEquipo && (
                            <p className="text-sm text-gray-500 font-mono">
                              S/N: {orden.serieEquipo}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={getBadgeVariant(orden.tipoServicio)}>
                          {SERVICE_TYPE_LABELS[orden.tipoServicio]}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        {orden.tecnico ? (
                          <span className="text-gray-900">{orden.tecnico.name}</span>
                        ) : (
                          <span className="text-gray-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={getStatusBadgeVariant(orden.estado)}>
                          {STATUS_LABELS[orden.estado]}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(orden.id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards en móvil */}
            <div className="lg:hidden divide-y divide-gray-100">
              {ordenes.map((orden) => (
                <button
                  key={orden.id}
                  onClick={() => handleRowClick(orden.id)}
                  className="w-full text-left p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  {/* Fila superior: semáforo, folio, tipo badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SemaforoDot color={orden.semaforo} />
                      <span className="font-mono font-semibold text-[#092139]">
                        {orden.folio}
                      </span>
                    </div>
                    <Badge variant={getBadgeVariant(orden.tipoServicio)} className="text-xs">
                      {SERVICE_TYPE_LABELS[orden.tipoServicio]}
                    </Badge>
                  </div>

                  {/* Cliente */}
                  <p className="font-medium text-gray-900 text-sm">
                    {orden.cliente.nombre}
                    {orden.cliente.empresa && (
                      <span className="text-gray-500 font-normal"> • {orden.cliente.empresa}</span>
                    )}
                  </p>

                  {/* Equipo */}
                  <p className="text-sm text-gray-500 mt-1">
                    {orden.marcaEquipo} {orden.modeloEquipo}
                    {orden.serieEquipo && (
                      <span className="font-mono text-xs"> • S/N: {orden.serieEquipo}</span>
                    )}
                  </p>

                  {/* Fila inferior: estado y técnico */}
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant={getStatusBadgeVariant(orden.estado)} className="text-xs">
                      {STATUS_LABELS[orden.estado]}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {orden.tecnico ? orden.tecnico.name : "Sin asignar"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Paginación - responsive */}
        {!loading && !error && ordenes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 lg:px-6 py-4 border-t border-gray-100 gap-3">
            <p className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
              {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} de {total}
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex-1 sm:flex-none"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="text-sm text-gray-600 px-3 whitespace-nowrap">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
