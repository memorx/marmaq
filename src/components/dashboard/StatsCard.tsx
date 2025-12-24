import { cn } from "@/lib/utils/cn";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "blue" | "orange" | "green" | "purple";
}

const colorConfig = {
  blue: "bg-[#31A7D4]/10 text-[#31A7D4]",
  orange: "bg-[#D57828]/10 text-[#D57828]",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
};

export function StatsCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-[#092139]">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={cn("text-xs mt-2", trend.isPositive ? "text-green-600" : "text-red-600")}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% vs ayer
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colorConfig[color])}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
