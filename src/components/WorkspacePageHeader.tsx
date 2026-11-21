import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface WorkspacePageHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  icon?: LucideIcon;
  iconClassName?: string;
  subtitle?: string;
  compact?: boolean;
  animated?: boolean;
  wide?: boolean;
  rightContent?: ReactNode;
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
  animated = false,
  wide = false,
  rightContent,
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
    const headerContent = (
      <>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className={["relative mx-auto flex items-center gap-3 px-4 py-3", wide ? "max-w-4xl" : "max-w-2xl"].join(" ")}>
          {backControl}
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon className={`h-5 w-5 ${iconClassName}`} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold heading text-sm">{title}</h1>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          {rightContent}
        </div>
      </>
    );

    return animated ? (
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        {headerContent}
      </motion.header>
    ) : (
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
        {headerContent}
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
