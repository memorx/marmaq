"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, Badge, Input } from "@/components/ui";
import { ClienteModal } from "@/components/clientes";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  Users,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  FileText,
  AlertCircle,
} from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  esDistribuidor: boolean;
  codigoDistribuidor: string | null;
  notas: string | null;
  createdAt: string;
  _count: {
    ordenes: number;
  };
}

interface ClientesResponse {
  clientes: Cliente[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
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
  const [filterDistribuidor, setFilterDistribuidor] = useState<string>("all");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterDistribuidor !== "all") {
        params.append("esDistribuidor", filterDistribuidor);
      }
      params.append("page", String(pagination.page));
      params.append("pageSize", String(pagination.pageSize));

      const res = await fetch(`/api/clientes?${params}`);
      if (!res.ok) {
        throw new Error("Error al cargar clientes");
      }

      const data: ClientesResponse = await res.json();
      setClientes(data.clientes);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [search, filterDistribuidor, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCrearCliente = () => {
    setClienteEditar(null);
    setModalOpen(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteEditar(cliente);
    setModalOpen(true);
  };

  const handleEliminarCliente = async (cliente: Cliente) => {
    if (cliente._count.ordenes > 0) {
      alert(
        `No se puede eliminar "${cliente.nombre}" porque tiene ${cliente._count.ordenes} orden(es) asociada(s)`
      );
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar a "${cliente.nombre}"?`)) {
      return;
    }

    setDeleting(cliente.id);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar cliente");
      }

      fetchClientes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveCliente = () => {
    setModalOpen(false);
    setClienteEditar(null);
    fetchClientes();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#092139]">Clientes</h1>
          <p className="text-gray-500">
            {pagination.total} cliente{pagination.total !== 1 ? "s" : ""} registrado{pagination.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleCrearCliente} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre, empresa, teléfono o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterDistribuidor}
              onChange={(e) => {
                setFilterDistribuidor(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
            >
              <option value="all">Todos los clientes</option>
              <option value="true">Solo distribuidores</option>
              <option value="false">Solo clientes finales</option>
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

      {/* Lista de clientes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31A7D4]" />
        </div>
      ) : clientes.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay clientes
          </h3>
          <p className="text-gray-500 mb-4">
            {search
              ? "No se encontraron clientes con esos criterios"
              : "Comienza agregando tu primer cliente"}
          </p>
          {!search && (
            <Button onClick={handleCrearCliente}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Cliente
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map((cliente) => (
            <Card
              key={cliente.id}
              className="p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#31A7D4]/10 flex items-center justify-center">
                    {cliente.esDistribuidor ? (
                      <Building2 className="w-5 h-5 text-[#31A7D4]" />
                    ) : (
                      <Users className="w-5 h-5 text-[#31A7D4]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#092139]">
                      {cliente.nombre}
                    </h3>
                    {cliente.empresa && (
                      <p className="text-sm text-gray-500">{cliente.empresa}</p>
                    )}
                  </div>
                </div>
                {cliente.esDistribuidor && (
                  <Badge variant="centro">Distribuidor</Badge>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a
                    href={`tel:${cliente.telefono}`}
                    className="hover:text-[#31A7D4]"
                  >
                    {cliente.telefono}
                  </a>
                </div>

                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a
                      href={`mailto:${cliente.email}`}
                      className="hover:text-[#31A7D4] truncate"
                    >
                      {cliente.email}
                    </a>
                  </div>
                )}

                {(cliente.direccion || cliente.ciudad) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate">
                      {[cliente.direccion, cliente.ciudad]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {cliente._count.ordenes > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>
                      {cliente._count.ordenes} orden
                      {cliente._count.ordenes !== 1 ? "es" : ""}
                    </span>
                  </div>
                )}
              </div>

              {cliente.notas && (
                <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-4 line-clamp-2">
                  {cliente.notas}
                </p>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditarCliente(cliente)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEliminarCliente(cliente)}
                  disabled={deleting === cliente.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {deleting === cliente.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
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
      <ClienteModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setClienteEditar(null);
        }}
        onSave={handleSaveCliente}
        cliente={clienteEditar}
      />
    </div>
  );
}
