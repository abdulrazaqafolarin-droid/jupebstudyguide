import type { ReactNode } from "react";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeaderboardPanelFrameProps {
  children: ReactNode;
  statusLabel?: string;
  isLive?: boolean;
}

/** Shared leaderboard card chrome; programme-specific ranking data stays outside this component. */
export function LeaderboardPanelFrame({
  children,
  statusLabel,
  isLive = false,
}: LeaderboardPanelFrameProps) {
  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20">
            <Trophy className="h-4 w-4 text-accent" />
          </div>
          Leaderboard
          {statusLabel && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
              <span className={isLive ? "h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" : "h-1.5 w-1.5 rounded-full bg-amber-500"} />
              {statusLabel}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">{children}</CardContent>
    </Card>
  );
}
