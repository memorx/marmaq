import { cn } from "@/lib/utils/cn";
import { AlertTriangle, Clock, AlertCircle, CheckCircle, Info } from "lucide-react";

interface SemaforoItem {
  color: "rojo" | "naranja" | "amarillo" | "verde" | "azul";
  label: string;
  count: number;
  description: string;
}

const semaforoConfig = {
  rojo: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: AlertTriangle,
    dot: "bg-red-500",
  },
  naranja: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    icon: Clock,
    dot: "bg-orange-500",
  },
  amarillo: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    icon: AlertCircle,
    dot: "bg-yellow-500",
  },
  verde: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    icon: CheckCircle,
    dot: "bg-green-500",
  },
  azul: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: Info,
    dot: "bg-blue-500",
  },
};

interface SemaforoCardProps {
  items: SemaforoItem[];
}

export function SemaforoCard({ items }: SemaforoCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-[#092139] mb-4 flex items-center gap-2">
        <span className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
        </span>
        Sistema de Alertas
      </h3>
      <div className="space-y-2">
        {items.map((item) => {
          const config = semaforoConfig[item.color];
          const Icon = config.icon;

          return (
            <div
              key={item.color}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", config.dot)}></div>
                <Icon size={16} className={config.text} />
                <div>
                  <p className={cn("text-sm font-medium", config.text)}>{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
              <span className={cn("text-2xl font-bold", config.text)}>
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
