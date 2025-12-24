"use client";

import { useState } from "react";
import { Sidebar, Header } from "@/components/layout";
import { usePathname } from "next/navigation";

interface DashboardLayoutClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  children: React.ReactNode;
}

// Mapeo de rutas a títulos
const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Resumen del día" },
  "/ordenes": { title: "Órdenes de Servicio", subtitle: "Gestión de órdenes" },
  "/ordenes/nueva": { title: "Nueva Orden", subtitle: "Crear orden de servicio" },
  "/clientes": { title: "Clientes", subtitle: "Gestión de clientes" },
  "/materiales": { title: "Materiales", subtitle: "Inventario" },
  "/reportes": { title: "Reportes", subtitle: "Generación de reportes" },
  "/usuarios": { title: "Usuarios", subtitle: "Gestión de usuarios" },
  "/configuracion": { title: "Configuración", subtitle: "Ajustes del sistema" },
};

export function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Obtener título basado en la ruta
  const getPageInfo = () => {
    // Primero buscar coincidencia exacta
    if (routeTitles[pathname]) {
      return routeTitles[pathname];
    }

    // Luego buscar por prefijo (para rutas dinámicas como /ordenes/[id])
    if (pathname.startsWith("/ordenes/") && pathname !== "/ordenes/nueva") {
      return { title: "Detalle de Orden", subtitle: "Ver orden de servicio" };
    }

    // Por defecto
    return { title: "MARMAQ", subtitle: "Sistema de Reparaciones" };
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="lg:ml-[240px] min-h-screen flex flex-col">
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
