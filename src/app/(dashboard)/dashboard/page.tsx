"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SemaforoCard,
  StatsCard,
  OrdenesPorMesChart,
  TipoServicioChart,
  EstadoOrdenesChart,
  KPIsCard,
} from "@/components/dashboard";
import { Card, CardHeader, CardContent, Badge } from "@/components/ui";
import { ClipboardList, Wrench, CheckCircle, Clock, Loader2 } from "lucide-react";

interface DashboardStats {
  ordenesPorMes: { mes: string; cantidad: number }[];
  distribucionTipoServicio: { tipo: string; tipoKey: string; cantidad: number }[];
  distribucionEstado: { estado: string; estadoKey: string; cantidad: number }[];
  kpis: {
    tiempoPromedioReparacion: number;
    completadasEsteMes: number;
    completadasMesAnterior: number;
    tendenciaCompletadas: number;
    tecnicoTop: { nombre: string; ordenes: number } | null;
  };
  semaforo: {
    color: string;
    label: string;
    count: number;
    description: string;
  }[];
  stats: {
    ordenesActivas: number;
    enDiagnostico: number;
    reparadosHoy: number;
    tendenciaReparados: number;
    pendientesEvidencias: number;
  };
  ordenesRecientes: {
    id: string;
    folio: string;
    cliente: string;
    equipo: string;
    tipo: string;
    tipoServicio: string;
    estado: string;
    semaforo: string;
  }[];
}

const tipoVariant: Record<string, "garantia" | "centro" | "cobrar" | "repare"> = {
  garantia: "garantia",
  centro: "centro",
  cobrar: "cobrar",
  repare: "repare",
  porcobrar: "cobrar",
  centroservicio: "centro",
};

const tipoLabel: Record<string, string> = {
  GARANTIA: "Garantía",
  CENTRO_SERVICIO: "Centro Servicio",
  POR_COBRAR: "Por Cobrar",
  REPARE: "REPARE",
};

const estadoLabel: Record<string, string> = {
  RECIBIDO: "Recibido",
  EN_DIAGNOSTICO: "En Diagnóstico",
  COTIZACION_PENDIENTE: "Cotización Pendiente",
  ESPERA_REFACCIONES: "Espera Refacciones",
  EN_REPARACION: "En Reparación",
  REPARADO: "Reparado",
  LISTO_ENTREGA: "Listo para Entrega",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const semaforoColors: Record<string, string> = {
  rojo: "bg-red-500",
  naranja: "bg-orange-500",
  amarillo: "bg-yellow-500",
  verde: "bg-green-500",
  azul: "bg-blue-500",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) {
          throw new Error("Error al cargar estadísticas");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#31A7D4] animate-spin" />
          <p className="text-sm text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error al cargar el dashboard</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const semaforoData = stats.semaforo.map((item) => ({
    color: item.color as "rojo" | "naranja" | "amarillo" | "verde" | "azul",
    label: item.label,
    count: item.count,
    description: item.description,
  }));

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Stats Grid - 2 cols en móvil, 4 en desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatsCard
          title="Órdenes Activas"
          value={stats.stats.ordenesActivas}
          subtitle="En proceso"
          icon={ClipboardList}
          color="blue"
        />
        <StatsCard
          title="En Diagnóstico"
          value={stats.stats.enDiagnostico}
          subtitle="Pendientes de evaluar"
          icon={Wrench}
          color="orange"
        />
        <StatsCard
          title="Reparados Hoy"
          value={stats.stats.reparadosHoy}
          icon={CheckCircle}
          trend={
            stats.stats.tendenciaReparados !== 0
              ? { value: Math.abs(stats.stats.tendenciaReparados), isPositive: stats.stats.tendenciaReparados > 0 }
              : undefined
          }
          color="green"
        />
        <StatsCard
          title="Pendientes TORREY"
          value={stats.stats.pendientesEvidencias}
          subtitle="Sin evidencias"
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Main Content - Stack en móvil, grid en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Semáforo - primero en móvil */}
        <div className="lg:order-2">
          <SemaforoCard items={semaforoData} />
        </div>

        {/* Órdenes Recientes */}
        <div className="lg:col-span-2 lg:order-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base lg:text-lg font-semibold text-[#092139]">Órdenes Recientes</h2>
                <Link href="/ordenes" className="text-sm text-[#31A7D4] hover:underline">
                  Ver todas
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Tabla en desktop */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Folio</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Cliente</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Equipo</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Tipo</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.ordenesRecientes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                          No hay órdenes recientes
                        </td>
                      </tr>
                    ) : (
                      stats.ordenesRecientes.map((orden) => (
                        <tr key={orden.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/ordenes/${orden.id}`} className="flex items-center gap-2 hover:text-[#31A7D4]">
                              <span className={`w-2 h-2 rounded-full ${semaforoColors[orden.semaforo]}`}></span>
                              <span className="text-sm font-medium text-[#092139]">{orden.folio}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{orden.cliente}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{orden.equipo}</td>
                          <td className="px-4 py-3">
                            <Badge variant={tipoVariant[orden.tipo] || "centro"}>
                              {tipoLabel[orden.tipoServicio] || orden.tipoServicio}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{estadoLabel[orden.estado] || orden.estado}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cards en móvil */}
              <div className="md:hidden divide-y divide-gray-100">
                {stats.ordenesRecientes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No hay órdenes recientes
                  </div>
                ) : (
                  stats.ordenesRecientes.map((orden) => (
                    <Link
                      key={orden.id}
                      href={`/ordenes/${orden.id}`}
                      className="block p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${semaforoColors[orden.semaforo]}`}></span>
                          <span className="font-semibold text-[#092139]">{orden.folio}</span>
                        </div>
                        <Badge variant={tipoVariant[orden.tipo] || "centro"} className="text-xs">
                          {tipoLabel[orden.tipoServicio] || orden.tipoServicio}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{orden.cliente}</p>
                      <p className="text-sm text-gray-500 mb-2">{orden.equipo}</p>
                      <p className="text-xs text-gray-500">{estadoLabel[orden.estado] || orden.estado}</p>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gráficas Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Órdenes por mes */}
        <OrdenesPorMesChart data={stats.ordenesPorMes} />

        {/* Distribución por tipo de servicio */}
        <TipoServicioChart data={stats.distribucionTipoServicio} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Órdenes por estado */}
        <EstadoOrdenesChart data={stats.distribucionEstado} />

        {/* KPIs */}
        <KPIsCard data={stats.kpis} />
      </div>
    </div>
  );
}
