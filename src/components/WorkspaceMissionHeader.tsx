import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface WorkspaceMissionHeaderProps {
  badges: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

/** Shared gradient mission header for JUPEB and JAMB mission experiences. */
export function WorkspaceMissionHeader({
  badges,
  title,
  description,
  children,
}: WorkspaceMissionHeaderProps) {
  return (
    <Card className="overflow-hidden border-border">
      <div className="bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">{badges}</div>
        <h1 className="mt-4 text-2xl font-bold md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="p-6 md:p-8">{children}</div>}
    </Card>
  );
}

export default WorkspaceMissionHeader;
