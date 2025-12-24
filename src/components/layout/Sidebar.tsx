"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  FileBarChart,
  UserCog,
  Settings,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/ordenes", icon: ClipboardList, label: "Órdenes" },
  { href: "/clientes", icon: Users, label: "Clientes" },
  { href: "/materiales", icon: Package, label: "Materiales" },
  { href: "/reportes", icon: FileBarChart, label: "Reportes" },
  { href: "/usuarios", icon: UserCog, label: "Usuarios", adminOnly: true },
  { href: "/configuracion", icon: Settings, label: "Configuración", adminOnly: true },
];

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      SUPER_ADMIN: "Super Admin",
      COORD_SERVICIO: "Coord. Servicio",
      REFACCIONES: "Refacciones",
      TECNICO: "Técnico",
    };
    return roles[role] || role;
  };

  // Filtrar items según rol
  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && user.role !== "SUPER_ADMIN") {
      return false;
    }
    return true;
  });

  const handleNavClick = () => {
    // Cerrar sidebar en móvil al navegar
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-[280px] lg:w-[240px] h-screen bg-gradient-to-b from-[#092139] to-[#1a4a6e] flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              MAR<span className="text-[#31A7D4]">MAQ</span>
            </h1>
            <p className="text-white/50 text-xs mt-0.5">Sistema de Reparaciones</p>
          </div>
          {/* Botón cerrar en móvil */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon size={20} className="lg:w-[18px] lg:h-[18px]" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-[#D57828] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {getInitials(user.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-white/50 text-xs">{getRoleLabel(user.role)}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 w-full px-3 py-2.5 lg:py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
          >
            <LogOut size={18} className="lg:w-4 lg:h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
