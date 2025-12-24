"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, Input } from "@/components/ui";
import { UsuarioModal } from "@/components/usuarios";
import {
  Search,
  Plus,
  Users,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  AlertCircle,
  Shield,
  UserCog,
  Wrench,
  Package,
  UserX,
  UserCheck,
} from "lucide-react";

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    ordenesAsignadas: number;
    ordenesCreadas: number;
  };
}

interface UsuariosResponse {
  usuarios: Usuario[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

const ROLES = [
  { value: "all", label: "Todos los roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "COORD_SERVICIO", label: "Coordinador" },
  { value: "REFACCIONES", label: "Refacciones" },
  { value: "TECNICO", label: "Técnico" },
];

const ESTADOS = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
];

function getRoleIcon(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return Shield;
    case "COORD_SERVICIO":
      return UserCog;
    case "REFACCIONES":
      return Package;
    case "TECNICO":
      return Wrench;
    default:
      return Users;
  }
}

function getRoleVariant(role: string): "danger" | "warning" | "info" | "success" {
  switch (role) {
    case "SUPER_ADMIN":
      return "danger";
    case "COORD_SERVICIO":
      return "warning";
    case "REFACCIONES":
      return "info";
    case "TECNICO":
      return "success";
    default:
      return "info";
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "COORD_SERVICIO":
      return "Coordinador";
    case "REFACCIONES":
      return "Refacciones";
    case "TECNICO":
      return "Técnico";
    default:
      return role;
  }
}

export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });

  // Filtros
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterActivo, setFilterActivo] = useState("all");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Verificar acceso (solo SUPER_ADMIN)
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    if (session.user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  const fetchUsuarios = useCallback(async () => {
    if (session?.user?.role !== "SUPER_ADMIN") return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterRole !== "all") {
        params.append("role", filterRole);
      }
      if (filterActivo !== "all") {
        params.append("activos", filterActivo);
      }
      params.append("page", String(pagination.page));
      params.append("pageSize", String(pagination.pageSize));

      const res = await fetch(`/api/usuarios?${params}`);
      if (!res.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data: UsuariosResponse = await res.json();
      setUsuarios(data.usuarios);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterActivo, pagination.page, pagination.pageSize, session?.user?.role]);

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") {
      fetchUsuarios();
    }
  }, [fetchUsuarios, session?.user?.role]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCrearUsuario = () => {
    setUsuarioEditar(null);
    setModalOpen(true);
  };

  const handleEditarUsuario = (usuario: Usuario) => {
    setUsuarioEditar(usuario);
    setModalOpen(true);
  };

  const handleEliminarUsuario = async (usuario: Usuario) => {
    // No permitir eliminarse a sí mismo
    if (usuario.id === session?.user?.id) {
      alert("No puedes eliminar tu propia cuenta");
      return;
    }

    const totalOrdenes = usuario._count.ordenesAsignadas + usuario._count.ordenesCreadas;
    if (totalOrdenes > 0) {
      alert(
        `No se puede eliminar "${usuario.name}" porque tiene ${totalOrdenes} orden(es) asociada(s). Considera desactivarlo en su lugar.`
      );
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar a "${usuario.name}"?`)) {
      return;
    }

    setDeleting(usuario.id);
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar usuario");
      }

      fetchUsuarios();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActivo = async (usuario: Usuario) => {
    // No permitir desactivarse a sí mismo
    if (usuario.id === session?.user?.id) {
      alert("No puedes desactivar tu propia cuenta");
      return;
    }

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !usuario.activo }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar usuario");
      }

      fetchUsuarios();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  const handleSaveUsuario = () => {
    setModalOpen(false);
    setUsuarioEditar(null);
    fetchUsuarios();
  };

  // Mostrar loading mientras verifica sesión
  if (status === "loading" || (session?.user?.role !== "SUPER_ADMIN" && status !== "unauthenticated")) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31A7D4]" />
      </div>
    );
  }

  // Si no tiene acceso, no mostrar nada (el useEffect redirigirá)
  if (session?.user?.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#092139]">Usuarios</h1>
          <p className="text-gray-500">
            {pagination.total} usuario{pagination.total !== 1 ? "s" : ""} registrado{pagination.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleCrearUsuario} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
              >
                {ROLES.map((rol) => (
                  <option key={rol.value} value={rol.value}>
                    {rol.label}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={filterActivo}
              onChange={(e) => {
                setFilterActivo(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
            >
              {ESTADOS.map((est) => (
                <option key={est.value} value={est.value}>
                  {est.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Lista de usuarios */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31A7D4]" />
        </div>
      ) : usuarios.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay usuarios
          </h3>
          <p className="text-gray-500 mb-4">
            {search || filterRole !== "all" || filterActivo !== "all"
              ? "No se encontraron usuarios con esos criterios"
              : "Comienza agregando tu primer usuario"}
          </p>
          {!search && filterRole === "all" && filterActivo === "all" && (
            <Button onClick={handleCrearUsuario}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Usuario
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usuarios.map((usuario) => {
            const RoleIcon = getRoleIcon(usuario.role);
            const esUsuarioActual = usuario.id === session?.user?.id;

            return (
              <Card
                key={usuario.id}
                className={`p-4 hover:shadow-md transition-shadow ${
                  !usuario.activo ? "opacity-60" : ""
                } ${esUsuarioActual ? "ring-2 ring-[#31A7D4] ring-opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      usuario.activo
                        ? "bg-[#31A7D4]/10"
                        : "bg-gray-200"
                    }`}>
                      <RoleIcon className={`w-5 h-5 ${
                        usuario.activo
                          ? "text-[#31A7D4]"
                          : "text-gray-400"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#092139] flex items-center gap-2">
                        {usuario.name}
                        {esUsuarioActual && (
                          <span className="text-xs text-[#31A7D4]">(Tú)</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{usuario.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={getRoleVariant(usuario.role)}>
                    {getRoleLabel(usuario.role)}
                  </Badge>
                  {!usuario.activo && (
                    <Badge variant="default">Inactivo</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">Órdenes asignadas</p>
                    <p className="font-semibold">{usuario._count.ordenesAsignadas}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">Órdenes creadas</p>
                    <p className="font-semibold">{usuario._count.ordenesCreadas}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditarUsuario(usuario)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>

                  {!esUsuarioActual && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActivo(usuario)}
                        className={usuario.activo
                          ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          : "text-green-600 hover:text-green-700 hover:bg-green-50"
                        }
                        title={usuario.activo ? "Desactivar" : "Activar"}
                      >
                        {usuario.activo ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEliminarUsuario(usuario)}
                        disabled={deleting === usuario.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleting === usuario.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} -{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            de {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      <UsuarioModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setUsuarioEditar(null);
        }}
        onSave={handleSaveUsuario}
        usuario={usuarioEditar}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
