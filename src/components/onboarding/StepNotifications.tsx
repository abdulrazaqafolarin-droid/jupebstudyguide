import { Bell, CalendarClock, MessageCircle, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

interface StepNotificationsProps {
  granted: boolean;
  requesting: boolean;
  onRequest: () => void;
}

/**
 * Step 4 — permission AFTER value. The student sees exactly what reminders
 * look like before the browser asks; the actual ask routes through the app's
 * existing push pipeline (web push subscription / native channel setup).
 */
export function StepNotifications({ granted, requesting, onRequest }: StepNotificationsProps) {
  const reduce = useReducedMotion();

  const samples = [
    {
      icon: CalendarClock,
      title: 'Daily mission ready',
      body: 'Day 4 of your 30-day plan is waiting ⚡',
      delay: 0,
    },
    {
      icon: MessageCircle,
      title: 'Ada sent you a message',
      body: "Let's revise thermodynamics 🔥",
      delay: 0.1,
    },
  ];

  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.9)' }}
        animate={{ opacity: 1, transform: 'scale(1)' }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
      >
        <Bell className="w-8 h-8 text-primary" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Never miss a beat</h2>
        <p className="text-sm text-muted-foreground">
          Mission reminders and messages from classmates — only the useful stuff.
        </p>
      </div>

      <div className="space-y-2.5 text-left">
        {samples.map((s) => (
          <motion.div
            key={s.title}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: reduce ? 0 : s.delay, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 shadow-sm"
          >
            <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <s.icon className="w-[18px] h-[18px] text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{s.title}</p>
              <p className="text-xs text-muted-foreground truncate">{s.body}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {granted && (
        <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-accent">
          <CheckCircle2 className="w-4 h-4" />
          Reminders are on
        </p>
      )}
    </div>
  );
}
