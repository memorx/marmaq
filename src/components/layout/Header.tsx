"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  FileText,
  Users,
  Package,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

interface OrdenResult {
  id: string;
  folio: string;
  tipoServicio: string;
  estado: string;
  marcaEquipo: string;
  modeloEquipo: string;
  cliente: { nombre: string };
}

interface ClienteResult {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string;
  email: string | null;
}

interface MaterialResult {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockBajo: boolean;
}

interface SearchResults {
  ordenes: OrdenResult[];
  clientes: ClienteResult[];
  materiales: MaterialResult[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Buscar cuando cambia el query debounced
  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error("Error en búsqueda:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Manejar teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // Navegar al resultado
  const handleResultClick = (type: "orden" | "cliente" | "material", id: string) => {
    setShowDropdown(false);
    setSearchQuery("");
    setResults(null);

    switch (type) {
      case "orden":
        router.push(`/ordenes/${id}`);
        break;
      case "cliente":
        router.push(`/clientes?highlight=${id}`);
        break;
      case "material":
        router.push(`/materiales?highlight=${id}`);
        break;
    }
  };

  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchQuery("");
    setResults(null);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const hasResults = results && (
    results.ordenes.length > 0 ||
    results.clientes.length > 0 ||
    results.materiales.length > 0
  );

  const noResults = results && !hasResults && debouncedQuery.length >= 2;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold text-[#092139]">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => results && setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar órdenes, clientes, materiales..."
              className="pl-10 pr-10 py-2 w-80 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={16} />
            )}
            {!isLoading && searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {showDropdown && (hasResults || noResults) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
              {noResults ? (
                <div className="p-4 text-center text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No se encontraron resultados para &quot;{debouncedQuery}&quot;</p>
                </div>
              ) : (
                <>
                  {/* Órdenes */}
                  {results.ordenes.length > 0 && (
                    <div className="border-b border-gray-100 last:border-b-0">
                      <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#31A7D4]" />
                        <span className="text-xs font-semibold text-gray-600 uppercase">
                          Órdenes ({results.ordenes.length})
                        </span>
                      </div>
                      {results.ordenes.map((orden) => (
                        <button
                          key={orden.id}
                          onClick={() => handleResultClick("orden", orden.id)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#092139]">
                                {orden.folio}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                orden.estado === "ENTREGADO"
                                  ? "bg-green-100 text-green-700"
                                  : orden.estado === "EN_REPARACION"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}>
                                {orden.estado.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {orden.marcaEquipo} {orden.modeloEquipo} • {orden.cliente.nombre}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Clientes */}
                  {results.clientes.length > 0 && (
                    <div className="border-b border-gray-100 last:border-b-0">
                      <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#31A7D4]" />
                        <span className="text-xs font-semibold text-gray-600 uppercase">
                          Clientes ({results.clientes.length})
                        </span>
                      </div>
                      {results.clientes.map((cliente) => (
                        <button
                          key={cliente.id}
                          onClick={() => handleResultClick("cliente", cliente.id)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#092139]">
                                {cliente.nombre}
                              </span>
                              {cliente.empresa && (
                                <span className="text-xs text-gray-500">
                                  ({cliente.empresa})
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {cliente.telefono}
                              {cliente.email && ` • ${cliente.email}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Materiales */}
                  {results.materiales.length > 0 && (
                    <div className="border-b border-gray-100 last:border-b-0">
                      <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#31A7D4]" />
                        <span className="text-xs font-semibold text-gray-600 uppercase">
                          Materiales ({results.materiales.length})
                        </span>
                      </div>
                      {results.materiales.map((material) => (
                        <button
                          key={material.id}
                          onClick={() => handleResultClick("material", material.id)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#092139]">
                                {material.nombre}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                {material.sku}
                              </span>
                              {material.stockBajo && (
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {material.categoria} • Stock: {material.stockActual}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
