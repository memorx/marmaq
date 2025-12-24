import Link from "next/link";
import { Header } from "@/components/layout";
import { SemaforoCard, StatsCard } from "@/components/dashboard";
import { Card, CardHeader, CardContent, Badge } from "@/components/ui";
import { ClipboardList, Wrench, CheckCircle, Clock } from "lucide-react";

// Datos de ejemplo (después vendrán de la BD)
const semaforoData = [
  { color: "rojo" as const, label: "Crítico", count: 3, description: "Equipo listo > 5 días sin recoger" },
  { color: "naranja" as const, label: "Urgente", count: 5, description: "Esperando refacciones" },
  { color: "amarillo" as const, label: "Atención", count: 4, description: "Sin cotización > 72h" },
  { color: "verde" as const, label: "Normal", count: 12, description: "En proceso sin alertas" },
  { color: "azul" as const, label: "Nuevos", count: 2, description: "Recibidos hoy" },
];

const ordenesRecientes = [
  { folio: "OS-2024-0089", cliente: "Carnicería El Toro", equipo: "Báscula Torrey L-EQ 10", tipo: "garantia", estado: "REPARADO", semaforo: "rojo" },
  { folio: "OS-2024-0090", cliente: "Gastroequipos GDL", equipo: "Molino Torrey M-22", tipo: "centro", estado: "ESPERA_REFACCIONES", semaforo: "naranja" },
  { folio: "OS-2024-0091", cliente: "Pollería San Juan", equipo: "Rebanadora R-300", tipo: "cobrar", estado: "EN_DIAGNOSTICO", semaforo: "amarillo" },
  { folio: "OS-2024-0092", cliente: "Rest. La Patrona", equipo: "Báscula LEQ-40", tipo: "garantia", estado: "EN_REPARACION", semaforo: "verde" },
  { folio: "OS-2024-0093", cliente: "Cremería Lupita", equipo: "Microondas MO-1", tipo: "repare", estado: "RECIBIDO", semaforo: "azul" },
];

const tipoVariant: Record<string, "garantia" | "centro" | "cobrar" | "repare"> = {
  garantia: "garantia",
  centro: "centro",
  cobrar: "cobrar",
  repare: "repare",
};

const tipoLabel: Record<string, string> = {
  garantia: "Garantía",
  centro: "Centro Servicio",
  cobrar: "Por Cobrar",
  repare: "REPARE",
};

const estadoLabel: Record<string, string> = {
  RECIBIDO: "Recibido",
  EN_DIAGNOSTICO: "En Diagnóstico",
  ESPERA_REFACCIONES: "Espera Refacciones",
  EN_REPARACION: "En Reparación",
  REPARADO: "Reparado",
  ENTREGADO: "Entregado",
};

const semaforoColors: Record<string, string> = {
  rojo: "bg-red-500",
  naranja: "bg-orange-500",
  amarillo: "bg-yellow-500",
  verde: "bg-green-500",
  azul: "bg-blue-500",
};

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <Header title="Dashboard" subtitle={today} />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Órdenes Activas"
            value={26}
            subtitle="En proceso"
            icon={ClipboardList}
            color="blue"
          />
          <StatsCard
            title="En Diagnóstico"
            value={8}
            subtitle="Pendientes de evaluar"
            icon={Wrench}
            color="orange"
          />
          <StatsCard
            title="Reparados Hoy"
            value={4}
            icon={CheckCircle}
            trend={{ value: 12, isPositive: true }}
            color="green"
          />
          <StatsCard
            title="Pendientes TORREY"
            value={7}
            subtitle="Sin evidencias completas"
            icon={Clock}
            color="purple"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Órdenes Recientes */}
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#092139]">Órdenes Recientes</h2>
                  <Link href="/ordenes" className="text-sm text-[#31A7D4] hover:underline">
                    Ver todas →
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
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
                    {ordenesRecientes.map((orden) => (
                      <tr key={orden.folio} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${semaforoColors[orden.semaforo]}`}></span>
                            <span className="text-sm font-medium text-[#092139]">{orden.folio}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{orden.cliente}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{orden.equipo}</td>
                        <td className="px-4 py-3">
                          <Badge variant={tipoVariant[orden.tipo]}>{tipoLabel[orden.tipo]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{estadoLabel[orden.estado]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Semáforo */}
          <div>
            <SemaforoCard items={semaforoData} />
          </div>
        </div>
      </div>
    </div>
  );
}
