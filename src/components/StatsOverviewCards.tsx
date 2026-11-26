import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface StatsOverviewItem {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color?: string;
}

interface StatsOverviewCardsProps {
  items: StatsOverviewItem[];
}

/** Shared overview metric cards used by both JUPEB and JAMB statistics pages. */
export function StatsOverviewCards({ items }: StatsOverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{card.label}</span>
            <card.icon className={`w-4 h-4 ${card.color ?? "text-primary"}`} />
          </div>
          <p className="text-2xl font-bold">{card.value}</p>
          {card.sub && <p className="text-[10px] text-muted-foreground -mt-1">{card.sub}</p>}
        </motion.div>
      ))}
    </div>
  );
}
