"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, Badge, Input } from "@/components/ui";
import { MaterialModal } from "@/components/materiales";
import {
  Search,
  Plus,
  Package,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Wrench,
  Fuel,
  Hammer,
} from "lucide-react";

interface Material {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  precioCompra: number | null;
  precioVenta: number | null;
  activo: boolean;
  stockBajo: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    usos: number;
  };
}

interface MaterialesResponse {
  materiales: Material[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

const CATEGORIAS = [
  { value: "all", label: "Todas las categorías" },
  { value: "REFACCION", label: "Refacciones" },
  { value: "CONSUMIBLE", label: "Consumibles" },
  { value: "HERRAMIENTA", label: "Herramientas" },
];

const ORDENAR_POR = [
  { value: "nombre-asc", label: "Nombre A-Z" },
  { value: "nombre-desc", label: "Nombre Z-A" },
  { value: "stockActual-asc", label: "Stock (menor a mayor)" },
  { value: "stockActual-desc", label: "Stock (mayor a menor)" },
  { value: "precioVenta-asc", label: "Precio (menor a mayor)" },
  { value: "precioVenta-desc", label: "Precio (mayor a menor)" },
];

function getCategoriaIcon(categoria: string) {
  switch (categoria) {
    case "REFACCION":
      return Wrench;
    case "CONSUMIBLE":
      return Fuel;
    case "HERRAMIENTA":
      return Hammer;
    default:
      return Package;
  }
}

function getCategoriaVariant(categoria: string): "info" | "centro" | "warning" {
  switch (categoria) {
    case "REFACCION":
      return "centro";
    case "CONSUMIBLE":
      return "info";
    case "HERRAMIENTA":
      return "warning";
    default:
      return "info";
  }
}

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState<Material[]>([]);
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
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterStockBajo, setFilterStockBajo] = useState(false);
  const [ordenar, setOrdenar] = useState("nombre-asc");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [materialEditar, setMaterialEditar] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMateriales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterCategoria !== "all") {
        params.append("categoria", filterCategoria);
      }
      if (filterStockBajo) {
        params.append("stockBajo", "true");
      }

      const [orderBy, orderDir] = ordenar.split("-");
      params.append("orderBy", orderBy);
      params.append("orderDir", orderDir);

      params.append("page", String(pagination.page));
      params.append("pageSize", String(pagination.pageSize));

      const res = await fetch(`/api/materiales?${params}`);
      if (!res.ok) {
        throw new Error("Error al cargar materiales");
      }

      const data: MaterialesResponse = await res.json();
      setMateriales(data.materiales);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [search, filterCategoria, filterStockBajo, ordenar, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchMateriales();
  }, [fetchMateriales]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCrearMaterial = () => {
    setMaterialEditar(null);
    setModalOpen(true);
  };

  const handleEditarMaterial = (material: Material) => {
    setMaterialEditar(material);
    setModalOpen(true);
  };

  const handleEliminarMaterial = async (material: Material) => {
    if (material._count.usos > 0) {
      alert(
        `No se puede eliminar "${material.nombre}" porque se ha usado en ${material._count.usos} orden(es)`
      );
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar "${material.nombre}"?`)) {
      return;
    }

    setDeleting(material.id);
    try {
      const res = await fetch(`/api/materiales/${material.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar material");
      }

      fetchMateriales();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveMaterial = () => {
    setModalOpen(false);
    setMaterialEditar(null);
    fetchMateriales();
  };

  const formatPrecio = (precio: number | null) => {
    if (precio === null) return "-";
    return `$${precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header - Mobile optimizado */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-[#092139]">Materiales</h1>
          <p className="text-gray-500 text-xs lg:text-sm">
            {pagination.total} material{pagination.total !== 1 ? "es" : ""}
          </p>
        </div>
        <Button onClick={handleCrearMaterial} size="sm" className="flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Material</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Filtros - Stack en móvil */}
      <Card className="p-3 lg:p-4">
        <div className="space-y-3 lg:space-y-0 lg:flex lg:flex-row lg:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar SKU, nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 py-3 lg:py-2"
            />
          </div>

          {/* Fila de filtros */}
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 hidden sm:block" />
              <select
                value={filterCategoria}
                onChange={(e) => {
                  setFilterCategoria(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="flex-1 sm:flex-none px-3 py-3 lg:py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <ArrowUpDown className="w-4 h-4 text-gray-400 flex-shrink-0 hidden sm:block" />
              <select
                value={ordenar}
                onChange={(e) => {
                  setOrdenar(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="flex-1 sm:flex-none px-3 py-3 lg:py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
              >
                {ORDENAR_POR.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2 -m-1 rounded-lg active:bg-gray-100">
              <input
                type="checkbox"
                checked={filterStockBajo}
                onChange={(e) => {
                  setFilterStockBajo(e.target.checked);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-5 h-5 lg:w-4 lg:h-4 text-[#31A7D4] border-gray-300 rounded focus:ring-[#31A7D4]"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1 whitespace-nowrap">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline">Solo stock bajo</span>
                <span className="sm:hidden">Bajo</span>
              </span>
            </label>
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

      {/* Lista de materiales */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31A7D4]" />
        </div>
      ) : materiales.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay materiales
          </h3>
          <p className="text-gray-500 mb-4">
            {search || filterCategoria !== "all" || filterStockBajo
              ? "No se encontraron materiales con esos criterios"
              : "Comienza agregando tu primer material al inventario"}
          </p>
          {!search && filterCategoria === "all" && !filterStockBajo && (
            <Button onClick={handleCrearMaterial}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Material
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materiales.map((material) => {
            const CategoriaIcon = getCategoriaIcon(material.categoria);

            return (
              <Card
                key={material.id}
                className={`p-4 hover:shadow-md transition-shadow ${
                  material.stockBajo ? "ring-2 ring-amber-400 ring-opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      material.stockBajo
                        ? "bg-amber-100"
                        : "bg-[#31A7D4]/10"
                    }`}>
                      <CategoriaIcon className={`w-5 h-5 ${
                        material.stockBajo
                          ? "text-amber-600"
                          : "text-[#31A7D4]"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#092139]">
                        {material.nombre}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">
                        {material.sku}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getCategoriaVariant(material.categoria)}>
                    {material.categoria}
                  </Badge>
                </div>

                {material.descripcion && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {material.descripcion}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${
                    material.stockBajo
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-gray-50"
                  }`}>
                    <p className="text-xs text-gray-500">Stock</p>
                    <p className={`font-semibold ${
                      material.stockBajo ? "text-amber-700" : "text-gray-900"
                    }`}>
                      {material.stockActual}
                      {material.stockBajo && (
                        <AlertTriangle className="w-4 h-4 inline ml-1 text-amber-500" />
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      Mín: {material.stockMinimo}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <p className="text-xs text-gray-500">Precio Venta</p>
                    <p className="font-semibold text-gray-900">
                      {formatPrecio(material.precioVenta)}
                    </p>
                    {material.precioCompra !== null && (
                      <p className="text-xs text-gray-400">
                        Compra: {formatPrecio(material.precioCompra)}
                      </p>
                    )}
                  </div>
                </div>

                {material._count.usos > 0 && (
                  <p className="text-xs text-gray-500 mb-3">
                    Usado en {material._count.usos} orden{material._count.usos !== 1 ? "es" : ""}
                  </p>
                )}

                {!material.activo && (
                  <div className="mb-3">
                    <Badge variant="danger">Inactivo</Badge>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditarMaterial(material)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEliminarMaterial(material)}
                    disabled={deleting === material.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deleting === material.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginación - responsive */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
            {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total}
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 px-2 whitespace-nowrap">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="flex-1 sm:flex-none"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      <MaterialModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setMaterialEditar(null);
        }}
        onSave={handleSaveMaterial}
        material={materialEditar}
      />
    </div>
  );
}
