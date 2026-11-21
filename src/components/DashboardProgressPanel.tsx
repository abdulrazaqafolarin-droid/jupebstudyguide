import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ProgressRing } from "@/components/ProgressRing";

export type DashboardProgressPalette = "primary" | "physics" | "accent" | "destructive";

export interface DashboardProgressMetric {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  palette: DashboardProgressPalette;
}

interface DashboardProgressPanelProps {
  progress: number;
  progressText?: string;
  progressLabel: string;
  metrics: DashboardProgressMetric[];
  ariaLabel?: string;
}

const paletteClasses: Record<DashboardProgressPalette, { card: string; icon: string; value: string }> = {
  primary: {
    card: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10 hover:border-primary/30",
    icon: "text-primary",
    value: "text-primary",
  },
  physics: {
    card: "bg-gradient-to-br from-physics/10 to-physics/5 border-physics/10 hover:border-physics/30",
    icon: "text-physics",
    value: "text-physics",
  },
  accent: {
    card: "bg-gradient-to-br from-accent/10 to-accent/5 border-accent/10 hover:border-accent/30",
    icon: "text-accent",
    value: "text-accent",
  },
  destructive: {
    card: "bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/10 hover:border-destructive/30",
    icon: "text-destructive",
    value: "text-destructive",
  },
};

/** One shared overall-progress layout for both exam programme dashboards. */
export function DashboardProgressPanel({
  progress,
  progressText = `${Math.round(progress)}%`,
  progressLabel,
  metrics,
  ariaLabel = "Overall progress",
}: DashboardProgressPanelProps) {
  return (
    <section className="mb-12 animate-in-up stagger-1" aria-label={ariaLabel}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 chalk-texture md:p-8">
        <div className="absolute -right-0 top-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-0 -left-0 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative flex flex-col items-center gap-8 md:flex-row">
          <ProgressRing progress={progress} size={140} strokeWidth={10}>
            <div className="text-center">
              <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-3xl font-bold text-transparent">{progressText}</span>
              <p className="text-xs text-muted-foreground">{progressLabel}</p>
            </div>
          </ProgressRing>

          <div className="grid w-full flex-1 grid-cols-2 gap-3 md:grid-cols-4">
            {metrics.map((metric) => {
              const palette = paletteClasses[metric.palette];
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className={`rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5 ${palette.card}`}
                >
                  <Icon className={`mx-auto mb-2 h-6 w-6 ${palette.icon}`} />
                  <p className={`text-2xl font-bold tabular-nums ${palette.value}`}>{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
