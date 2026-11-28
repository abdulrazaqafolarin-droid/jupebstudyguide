import type { ReactNode } from "react";
import { motion, type Transition, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export interface WorkspaceQuickAction {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  toneClassName: string;
  onClick: () => void;
}

const springBounce: Transition = { type: "spring", stiffness: 300, damping: 12, mass: 0.8 };
const fastSpring: Transition = { type: "spring", stiffness: 400, damping: 15, mass: 0.6 };

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: springBounce },
};

/**
 * The one quick-action layout for both exam programmes.
 * Only each programme's action data and destinations are different.
 */
export function WorkspaceQuickActions({ items }: { items: WorkspaceQuickAction[] }) {
  return (
    <section className="mt-12">
      <h2 className="mb-6 text-2xl font-bold">Quick Actions</h2>
      <motion.div
        className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-5"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
      >
        {items.map((action) => (
          <motion.button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className={cn(
              "w-full rounded-xl border p-4 text-center transition-all duration-300",
              "hover:-translate-y-1 hover:shadow-lg",
              action.toneClassName,
            )}
            variants={cardVariants}
            whileHover={{ scale: 1.05, y: -4, transition: fastSpring }}
            whileTap={{ scale: 0.95, transition: fastSpring }}
          >
            <span className="mx-auto flex h-7 w-7 items-center justify-center">
              {action.icon}
            </span>
            <p className="mt-2 font-medium">{action.title}</p>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </motion.button>
        ))}
      </motion.div>
    </section>
  );
}

export default WorkspaceQuickActions;
