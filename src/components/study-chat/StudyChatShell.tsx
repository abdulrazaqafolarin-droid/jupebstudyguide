import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, Menu, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TextbookUploader } from "@/components/TextbookUploader";
import type { ExamProgramId } from "@/lib/exam-program";

interface StudyChatShellProps {
  programId: ExamProgramId;
  backTo: string;
  backLabel: string;
  historyLabel: string;
  title: string;
  subtitle: string;
  sidebar: ReactNode;
  isMobile: boolean;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  showTextbooks: boolean;
  onTextbooksOpenChange: (open: boolean) => void;
  onNewChat: () => void;
  onBack?: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
}

/**
 * Shared JUPEB/JAMB study-chat frame.
 *
 * Both programmes deliberately use one implementation for navigation,
 * responsive history, header controls and textbook-library dialogs. Their
 * chat data, prompts, context and histories stay programme-scoped in the
 * page/hook that supplies the children.
 */
export function StudyChatShell({
  programId,
  backTo,
  backLabel,
  historyLabel,
  title,
  subtitle,
  sidebar,
  isMobile,
  drawerOpen,
  onDrawerOpenChange,
  showTextbooks,
  onTextbooksOpenChange,
  onNewChat,
  onBack,
  headerActions,
  children,
}: StudyChatShellProps) {
  const programmeName = programId === "jamb" ? "JAMB" : "JUPEB";

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[280px] shrink-0 border-r border-border/60 bg-card/30 md:block">
          {sidebar}
        </aside>

        {isMobile && drawerOpen && (
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={historyLabel}>
            <div className="flex h-full w-[85%] max-w-[320px] flex-col border-r border-border/60 bg-background shadow-2xl">
              {sidebar}
            </div>
            <button
              type="button"
              className="flex-1 bg-black/50"
              aria-label="Close history"
              onClick={() => onDrawerOpenChange(false)}
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 py-2.5 backdrop-blur-sm">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                aria-label={backLabel}
                title={backLabel}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to={backTo}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                aria-label={backLabel}
                title={backLabel}
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            {isMobile && (
              <button
                type="button"
                onClick={() => onDrawerOpenChange(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                aria-label={`Open ${historyLabel}`}
                title={historyLabel}
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold">{title}</h1>
              <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
            </div>
            {headerActions}
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-xs"
              onClick={() => onTextbooksOpenChange(true)}
              title={`Open your ${programmeName} textbook library`}
              aria-label={`Open ${programmeName} textbook library`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Textbooks</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-xs"
              onClick={onNewChat}
              title="New chat"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </div>

      <Dialog open={showTextbooks} onOpenChange={onTextbooksOpenChange}>
        <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto p-0">
          <TextbookUploader programId={programId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
