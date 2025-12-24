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
} from "lucide-react";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/ordenes", icon: ClipboardList, label: "Órdenes" },
  { href: "/clientes", icon: Users, label: "Clientes" },
  { href: "/materiales", icon: Package, label: "Materiales" },
  { href: "/reportes", icon: FileBarChart, label: "Reportes" },
  { href: "/usuarios", icon: UserCog, label: "Usuarios" },
  { href: "/configuracion", icon: Settings, label: "Configuración" },
];

export function Sidebar({ user }: SidebarProps) {
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

  return (
    <aside className="w-[240px] h-screen bg-gradient-to-b from-[#092139] to-[#1a4a6e] flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">
          MAR<span className="text-[#31A7D4]">MAQ</span>
        </h1>
        <p className="text-white/50 text-xs mt-0.5">Sistema de Reparaciones</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={18} />
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
          <div className="w-9 h-9 rounded-full bg-[#D57828] flex items-center justify-center">
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
          className="flex items-center gap-2 w-full px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
