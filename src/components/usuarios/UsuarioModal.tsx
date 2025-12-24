"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card } from "@/components/ui";
import { X, Save, User, AlertTriangle, Eye, EyeOff } from "lucide-react";

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  activo: boolean;
}

interface UsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  usuario: Usuario | null;
  currentUserId?: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  activo: boolean;
}

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin", description: "Acceso completo al sistema" },
  { value: "COORD_SERVICIO", label: "Coordinador de Servicio", description: "Gestiona órdenes y técnicos" },
  { value: "REFACCIONES", label: "Refacciones", description: "Gestiona inventario de materiales" },
  { value: "TECNICO", label: "Técnico", description: "Realiza reparaciones" },
];

export function UsuarioModal({ isOpen, onClose, onSave, usuario, currentUserId }: UsuarioModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "TECNICO",
    activo: true,
  });

  const isEditing = !!usuario;
  const isCurrentUser = usuario?.id === currentUserId;

  useEffect(() => {
    if (isOpen) {
      if (usuario) {
        setFormData({
          name: usuario.name,
          email: usuario.email,
          password: "",
          confirmPassword: "",
          role: usuario.role,
          activo: usuario.activo,
        });
      } else {
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "TECNICO",
          activo: true,
        });
      }
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen, usuario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validar campos requeridos
      if (!formData.name.trim()) {
        throw new Error("El nombre es requerido");
      }
      if (!formData.email.trim()) {
        throw new Error("El email es requerido");
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error("Email inválido");
      }

      // Validar contraseña (requerida solo al crear)
      if (!isEditing) {
        if (!formData.password) {
          throw new Error("La contraseña es requerida");
        }
        if (formData.password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres");
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Las contraseñas no coinciden");
        }
      } else if (formData.password) {
        // Si está editando y puso contraseña, validar
        if (formData.password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres");
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Las contraseñas no coinciden");
        }
      }

      // Validar que no se quite su propio rol de admin
      if (isCurrentUser && usuario?.role === "SUPER_ADMIN" && formData.role !== "SUPER_ADMIN") {
        throw new Error("No puedes quitarte tu propio rol de administrador");
      }

      // Validar que no se desactive a sí mismo
      if (isCurrentUser && !formData.activo) {
        throw new Error("No puedes desactivar tu propia cuenta");
      }

      const url = isEditing ? `/api/usuarios/${usuario.id}` : "/api/usuarios";
      const method = isEditing ? "PATCH" : "POST";

      const bodyData: Record<string, unknown> = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        role: formData.role,
        activo: formData.activo,
      };

      // Solo incluir contraseña si se proporcionó
      if (formData.password) {
        bodyData.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar usuario");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <Card className="relative w-full max-w-lg max-h-[90vh] overflow-hidden bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#31A7D4]/10 flex items-center justify-center">
              <User className="w-5 h-5 text-[#31A7D4]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#092139]">
                {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? usuario.email : "Ingresa los datos del usuario"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {isCurrentUser && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              Estás editando tu propia cuenta. Algunas opciones están restringidas.
            </div>
          )}

          <div className="space-y-4">
            {/* Nombre */}
            <Input
              label="Nombre completo *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Juan Pérez"
              required
            />

            {/* Email */}
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@marmaq.com"
              required
            />

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isEditing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isEditing ? "••••••••" : "Mínimo 6 caracteres"}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
                  required={!isEditing}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            {(formData.password || !isEditing) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar contraseña {!isEditing && "*"}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repetir contraseña"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
                  required={!isEditing || !!formData.password}
                />
              </div>
            )}

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                disabled={isCurrentUser && usuario?.role === "SUPER_ADMIN"}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {ROLES.map((rol) => (
                  <option key={rol.value} value={rol.value}>
                    {rol.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {ROLES.find((r) => r.value === formData.role)?.description}
              </p>
            </div>

            {/* Activo */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) =>
                  setFormData({ ...formData, activo: e.target.checked })
                }
                disabled={isCurrentUser}
                className="w-4 h-4 text-[#31A7D4] border-gray-300 rounded focus:ring-[#31A7D4] disabled:cursor-not-allowed"
              />
              <label htmlFor="activo" className="flex-1">
                <span className="font-medium text-gray-700">Usuario Activo</span>
                <p className="text-sm text-gray-500">
                  Los usuarios inactivos no pueden iniciar sesión
                </p>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={saving}>
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? "Guardar Cambios" : "Crear Usuario"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
