import { useState } from 'react';
import { Reorder } from 'framer-motion';
import { Subject, SUBJECT_INFO } from '@/types/question';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { GripVertical, Shuffle, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  subjects: Subject[];
  onApply: (ordered: Subject[]) => void;
}

/**
 * Drag-to-reorder subject priority. Reorders pending days while preserving
 * completed work and the 30-day total (logic lives in useSyllabusProgress).
 */
export const SubjectReorder = ({ subjects, onApply }: Props) => {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<Subject[]>(subjects);

  const reset = () => setOrder(subjects);
  const apply = () => {
    onApply(order);
    setOpen(false);
    toast.success('Syllabus rebalanced to match your new priority');
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => { setOrder(subjects); setOpen(true); }} className="gap-2">
        <Shuffle className="w-4 h-4" />
        Reorder subjects
      </Button>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-primary" />
          Drag to set subject priority
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Top of the list is taught first. Completed days stay locked; remaining days rebalance to keep your 30-day plan.
        </p>
      </CardHeader>
      <CardContent>
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
          {order.map((subject) => {
            const info = SUBJECT_INFO[subject];
            return (
              <Reorder.Item
                key={subject}
                value={subject}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border cursor-grab active:cursor-grabbing select-none"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-2xl">{info.icon}</span>
                <span className="font-medium flex-1">{info.name}</span>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
        <div className="flex gap-2 mt-4">
          <Button onClick={apply} className="flex-1 gap-2">
            <Check className="w-4 h-4" /> Apply
          </Button>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }} className="gap-2">
            <X className="w-4 h-4" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubjectReorder;
