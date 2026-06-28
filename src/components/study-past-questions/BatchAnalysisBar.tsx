import { useBatchAnalysis } from '@/contexts/BatchAnalysisContext';
import { ChevronUp, ChevronDown, X, Loader2, CheckCircle2, AlertCircle, Trash2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BatchAnalysisBar() {
  const {
    queue, isProcessing, isMinimized, hasActiveItems,
    clearCompleted, toggleMinimized, cancelAll,
  } = useBatchAnalysis();

  if (queue.length === 0) return null;

  const activeItem = queue.find(i => i.status === 'processing');
  const queuedCount = queue.filter(i => i.status === 'queued').length;
  const completedCount = queue.filter(i => i.status === 'completed').length;
  const failedCount = queue.filter(i => i.status === 'failed').length;
  const totalQuestions = queue.reduce((sum, i) => sum + i.total, 0);
  const doneQuestions = queue.reduce((sum, i) => sum + i.current, 0);

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300",
      isMinimized ? "translate-y-[calc(100%-40px)]" : "translate-y-0"
    )}>
      <div className="mx-auto max-w-3xl px-4 pb-4">
        <div className="bg-card border shadow-xl rounded-2xl overflow-hidden">
          {/* Minimized handle bar */}
          <button
            onClick={toggleMinimized}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-medium">
                {isProcessing ? 'Analyzing...' : 'Analysis complete'}
              </span>
              <span className="text-xs text-muted-foreground">
                {doneQuestions}/{totalQuestions}
                {queuedCount > 0 && ` · ${queuedCount} in queue`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isProcessing && (
                <button
                  onClick={(e) => { e.stopPropagation(); cancelAll(); }}
                  className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Cancel all"
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
              )}
              {isMinimized ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Expanded content */}
          {!isMinimized && (
            <div className="px-4 pb-4 space-y-2">
              {/* Active item progress */}
              {activeItem && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium capitalize">
                      {activeItem.subject} {activeItem.year} ({activeItem.category})
                    </span>
                    <span>
                      {activeItem.current}/{activeItem.total}
                      {activeItem.success > 0 && ` · ${activeItem.success} ok`}
                      {activeItem.failed > 0 && ` · ${activeItem.failed} failed`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(activeItem.current / activeItem.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Queue list */}
              {queue.length > 1 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {queue.filter(i => i.status !== 'processing').map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 rounded-lg text-xs",
                        item.status === 'completed' && "text-green-600 dark:text-green-400",
                        item.status === 'failed' && "text-destructive",
                        item.status === 'queued' && "text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {item.status === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle className="h-3 w-3 shrink-0" />
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                        )}
                        <span className="capitalize">
                          {item.subject} {item.year} ({item.category})
                        </span>
                      </div>
                      <span>
                        {item.status === 'queued'
                          ? `${item.total} questions`
                          : item.status === 'completed'
                            ? `${item.success}/${item.total}`
                            : item.error || `${item.failed} failed`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {completedCount + failedCount > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear completed
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
