"use client";

import { Badge } from "@/components/ui";
import { AvatarUpload } from "@/components/usuarios";
import { Mail, Shield } from "lucide-react";
import type { Role } from "@prisma/client";

interface PerfilUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
}

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  COORD_SERVICIO: "Coord. Servicio",
  REFACCIONES: "Refacciones",
  TECNICO: "Técnico",
  VENDEDOR: "Vendedor",
};

const roleVariants: Record<Role, "info" | "warning" | "success" | "default"> = {
  SUPER_ADMIN: "info",
  COORD_SERVICIO: "warning",
  REFACCIONES: "success",
  TECNICO: "default",
  VENDEDOR: "default",
};

export function PerfilClient({ user }: { user: PerfilUser }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Avatar upload */}
          <AvatarUpload
            userId={user.id}
            currentAvatarUrl={user.avatarUrl}
            userName={user.name}
          />

          {/* Nombre */}
          <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>

          {/* Info */}
          <div className="w-full space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-5 h-5 text-gray-400" />
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <Badge variant={roleVariants[user.role]}>
                {roleLabels[user.role]}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
