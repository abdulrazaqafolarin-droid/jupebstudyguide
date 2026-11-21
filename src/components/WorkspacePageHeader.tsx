import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface WorkspacePageHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  icon?: LucideIcon;
  iconClassName?: string;
  subtitle?: string;
  compact?: boolean;
}

/** Shared sticky page header for JUPEB and JAMB secondary pages. */
export function WorkspacePageHeader({
  title,
  backTo = "/",
  backLabel = "Go back",
  onBack,
  icon: Icon,
  iconClassName = "text-primary",
  subtitle,
  compact = false,
}: WorkspacePageHeaderProps) {
  const backControlClassName = compact
    ? "inline-flex h-8 w-8 shrink-0 -ml-1 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    : "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  const backControl = onBack ? (
    <button
      type="button"
      className={backControlClassName}
      onClick={onBack}
      aria-label={backLabel}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  ) : (
    <Link to={backTo} aria-label={backLabel} className={backControlClassName}>
      <ArrowLeft className="h-5 w-5" />
    </Link>
  );

  if (compact) {
    return (
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {backControl}
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-sm">{title}</h1>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
        {backControl}
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-lg flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 shrink-0 ${iconClassName}`} />}
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
