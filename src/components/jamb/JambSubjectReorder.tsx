import { useState } from "react";
import { Reorder } from "framer-motion";
import { Check, GripVertical, Shuffle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JAMB_SYLLABUS } from "@/lib/jamb-syllabus";
import type { JambPlanSubject } from "@/lib/jamb-30-day-syllabus";

interface JambSubjectReorderProps {
  subjects: JambPlanSubject[];
  onApply: (orderedSubjects: JambPlanSubject[]) => void;
}

/** Drag-to-reorder JAMB subject priority while preserving completed study days. */
export function JambSubjectReorder({ subjects, onApply }: JambSubjectReorderProps) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState(subjects);

  const start = () => {
    setOrder(subjects);
    setOpen(true);
  };

  const apply = () => {
    onApply(order);
    setOpen(false);
    toast.success("Your remaining JAMB study days have been rebalanced.");
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={start} className="gap-2">
        <Shuffle className="h-4 w-4" />
        Reorder subjects
      </Button>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shuffle className="h-4 w-4 text-primary" />
          Drag to set subject priority
        </CardTitle>
        <CardDescription>
          Subjects near the top are scheduled first. Completed days and topics already covered stay locked; only remaining days are rebalanced.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
          {order.map((subject) => {
            const syllabus = JAMB_SYLLABUS[subject];
            return (
              <Reorder.Item
                key={subject}
                value={subject}
                className="flex cursor-grab select-none items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3 active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-2xl">{syllabus.icon}</span>
                <span className="flex-1 font-medium">{syllabus.label}</span>
                {subject === "use_of_english" && <span className="text-[10px] text-muted-foreground">Compulsory</span>}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
        <div className="mt-4 flex gap-2">
          <Button onClick={apply} className="flex-1 gap-2">
            <Check className="h-4 w-4" /> Apply new order
          </Button>
          <Button variant="ghost" onClick={() => { setOrder(subjects); setOpen(false); }} className="gap-2">
            <X className="h-4 w-4" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default JambSubjectReorder;
