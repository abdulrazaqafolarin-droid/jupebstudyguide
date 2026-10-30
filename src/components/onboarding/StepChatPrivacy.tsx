import { Globe, CheckCheck, Search } from 'lucide-react';
import { ChatMockup } from './ChatMockup';
import { Switch } from '@/components/ui/switch';

interface StepChatPrivacyProps {
  online: boolean;
  receipts: boolean;
  discover: boolean;
  onOnlineChange: (v: boolean) => void;
  onReceiptsChange: (v: boolean) => void;
  onDiscoverChange: (v: boolean) => void;
  onBrowseClassmates: () => void;
}

/**
 * Step 3 — student-to-student chat. First show it (the mockup plays itself),
 * then hand over the REAL comfort controls: each switch maps 1:1 to an
 * existing profiles privacy column, so what the student picks here is
 * genuinely how chat behaves — not an onboarding-only decoration.
 */
export function StepChatPrivacy({
  online,
  receipts,
  discover,
  onOnlineChange,
  onReceiptsChange,
  onDiscoverChange,
  onBrowseClassmates,
}: StepChatPrivacyProps) {
  const toggles = [
    {
      icon: Globe,
      label: 'Show when I\'m online',
      hint: 'Classmates see your green dot',
      checked: online,
      onChange: onOnlineChange,
    },
    {
      icon: CheckCheck,
      label: 'Read receipts',
      hint: 'Blue ticks when messages are read',
      checked: receipts,
      onChange: onReceiptsChange,
    },
    {
      icon: Search,
      label: 'Find me in Discover',
      hint: 'Classmates can find and message you',
      checked: discover,
      onChange: onDiscoverChange,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Meet your classmates</h2>
        <p className="text-sm text-muted-foreground">
          Real JUPEB students — search classmates, create study groups, send voice notes.
        </p>
      </div>

      <ChatMockup />

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your comfort controls</p>
        {toggles.map((t) => (
          <div
            key={t.label}
            className="flex items-center justify-between gap-3 bg-card rounded-xl border border-border p-3.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <t.icon className="w-4 h-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{t.hint}</p>
              </div>
            </div>
            <Switch checked={t.checked} onCheckedChange={t.onChange} aria-label={t.label} />
          </div>
        ))}
      </div>

      <button
        onClick={onBrowseClassmates}
        className="w-full text-center text-sm font-medium text-primary hover:underline underline-offset-4 py-1"
      >
        Browse classmates now →
      </button>
    </div>
  );
}
