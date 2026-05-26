import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatFullTimestamp } from './MessageStatusIcon';

interface EditRecord {
  id: number;
  old_ciphertext: string;
  created_at: string;
}

interface Props {
  messageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditHistorySheet({ messageId, open, onOpenChange }: Props) {
  const [edits, setEdits] = useState<EditRecord[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('message_edits')
      .select('id, old_ciphertext, created_at')
      .eq('message_id', messageId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setEdits(data);
      });
  }, [messageId, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[50vh]">
        <SheetHeader>
          <SheetTitle>Edit History</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full mt-4 pr-4">
          {edits.length === 0 && (
            <p className="text-muted-foreground text-sm">No edit history available.</p>
          )}
          {edits.map((edit, i) => (
            <div key={edit.id} className="flex items-start gap-3 py-3 border-b last:border-0">
              <Badge variant="outline" className="shrink-0 mt-0.5">
                v{edits.length - i}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{formatFullTimestamp(edit.created_at)}</p>
                <p className="text-sm truncate mt-1 font-mono text-muted-foreground">
                  {edit.old_ciphertext.slice(0, 48)}...
                </p>
              </div>
            </div>
          ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
