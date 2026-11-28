import type { ReactNode } from "react";

interface WorkspaceSetupPanelProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}

/** Shared JUPEB/JAMB setup panel, including the title row and sizing. */
export function WorkspaceSetupPanel({
  title,
  description,
  icon,
  children,
}: WorkspaceSetupPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 chalk-texture md:p-8">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default WorkspaceSetupPanel;
