import { Mic, ShieldAlert, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { isNativePlatform } from '@/lib/native-notifications';

interface MicPermissionDialogProps {
  open: boolean;
  /** 'priming' = first time, explain then ask. 'blocked' = already denied, guide to settings. */
  variant: 'priming' | 'blocked';
  requesting?: boolean;
  onAllow: () => void;
  onClose: () => void;
}

/**
 * The voice-note permission flow. Priming comes BEFORE the system prompt so
 * the ask has context ("we only record while you hold the button"); the
 * blocked variant gives platform-correct recovery steps, because once a
 * permission is hard-denied no page can re-prompt — only settings can.
 */
export function MicPermissionDialog({ open, variant, requesting, onAllow, onClose }: MicPermissionDialogProps) {
  const isNative = isNativePlatform;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        {variant === 'priming' ? (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-center text-lg">Send voice notes</DialogTitle>
            <DialogDescription className="text-center text-sm">
              JUPEB needs your microphone to record short voice messages in chat.
              We only record while you hold the button — nothing is captured otherwise.
            </DialogDescription>
            <div className="space-y-2 pt-1">
              <Button
                onClick={onAllow}
                disabled={requesting}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
              >
                {requesting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Allow microphone
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={requesting}
                className="w-full h-11 rounded-xl text-muted-foreground"
              >
                Not now
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-destructive" />
            </div>
            <DialogTitle className="text-center text-lg">Microphone is blocked</DialogTitle>
            <DialogDescription className="text-center text-sm">
              {isNative
                ? "Microphone access is turned off for the app. Open your phone's Settings → Apps → JUPEB Master → Permissions → Microphone, choose Allow, then come back and try again."
                : "Your browser is blocking the microphone for this site. Select the lock or mic icon near the address bar, set the microphone to Allow, then try again."}
            </DialogDescription>
            <div className="space-y-2 pt-1">
              <Button
                onClick={onAllow}
                disabled={requesting}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
              >
                {requesting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Try again
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={requesting}
                className="w-full h-11 rounded-xl text-muted-foreground"
              >
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
