"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("border border-border shadow-none", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-emerald-600" : "text-red-600"
                )}
              >
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl", iconBg)}>
            <Icon className={cn("size-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
