import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

let reloading = false;

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Auto-reload on stale chunk load failures (PWA redeploy) — capped at
    // 2 reloads per 10 minutes via sessionStorage so a permanently broken
    // chunk or an offline reload can't loop forever.
    if (
      !reloading &&
      error.message?.includes('dynamically imported')
    ) {
      try {
        const raw = sessionStorage.getItem('eb-auto-reload');
        const state = raw ? (JSON.parse(raw) as { t: number; n: number }) : { t: 0, n: 0 };
        const now = Date.now();
        const n = now - state.t < 600_000 ? state.n + 1 : 1;
        sessionStorage.setItem('eb-auto-reload', JSON.stringify({ t: now, n }));
        if (n <= 2) {
          reloading = true;
          setTimeout(() => window.location.reload(), 100);
        }
      } catch {
        // Storage blocked — skip auto-reload rather than risk a loop.
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const err = this.state.error;
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-lg w-full">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <div
              className="text-xs text-left font-mono bg-muted p-3 rounded-lg overflow-auto max-h-48 mb-4"
              onClick={() => {
                const text = `Message: ${err?.message}\n\nStack:\n${err?.stack || 'N/A'}`;
                navigator.clipboard.writeText(text);
              }}
              title="Click to copy"
            >
              <p className="text-muted-foreground mb-1 font-sans text-[10px] uppercase tracking-wider">
                Error details (click to copy)
              </p>
              <p className="text-destructive mb-2">{err?.message || 'Unknown error'}</p>
              {err?.stack && (
                <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
                  {err.stack}
                </pre>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
