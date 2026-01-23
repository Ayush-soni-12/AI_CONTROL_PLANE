import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: MetricCardProps) {
  return (
    <Card className="group hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1">
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-2">{title}</p>
          <p className="text-4xl font-bold bg-linear-to-br from-white to-gray-300 bg-clip-text text-transparent">
            {value}
          </p>
          {trend && (
            <p
              className={`text-sm mt-2 font-semibold flex items-center gap-1 ${trend.isPositive ? "text-green-400" : "text-red-400"}`}
            >
              <span className="text-lg">{trend.isPositive ? "↑" : "↓"}</span>
              {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div
          className={`p-4 rounded-xl ${color} border border-white/10 group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
        </div>
      </CardContent>
    </Card>
  );
}
