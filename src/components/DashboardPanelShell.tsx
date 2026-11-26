import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface DashboardPanelShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  trailing?: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
}

/** Shared dashboard card frame for programme-specific sections such as Daily Mission. */
export function DashboardPanelShell({
  icon: Icon,
  title,
  description,
  trailing,
  ariaLabel,
  children,
}: DashboardPanelShellProps) {
  return (
    <section aria-label={ariaLabel ?? title} className="mb-12 animate-in-up stagger-1">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-6 md:p-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {trailing}
        </div>
        <div className="space-y-4 p-6 md:p-8">{children}</div>
      </div>
    </section>
  );
}
