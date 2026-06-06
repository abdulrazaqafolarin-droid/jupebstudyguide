import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'abuse', label: 'Abuse' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fake_account', label: 'Fake account' },
  { value: 'other', label: 'Other' },
];

interface ReportUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
}

export function ReportUserDialog({ isOpen, onClose, reportedUserId }: ReportUserDialogProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    const { error } = await supabase.rpc('report_user', {
      p_reported_user_id: reportedUserId,
      p_reason: reason,
      p_description: description.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmitted(true);
    toast.success('Report submitted. Our team will review it.');
    setTimeout(() => { onClose(); setSubmitted(false); setReason(''); setDescription(''); }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl border shadow-xl w-full max-w-sm"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Flag className="w-4 h-4 text-destructive" />
                Report User
              </h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              <div className="p-8 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Check className="w-6 h-6 text-accent" />
                </div>
                <p className="text-sm font-medium">Report Submitted</p>
                <p className="text-xs text-muted-foreground text-center">Thanks for helping keep the community safe.</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground">Why are you reporting this user?</p>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setReason(r.value)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border',
                        reason === r.value
                          ? 'bg-destructive/10 border-destructive/30 text-destructive font-medium'
                          : 'bg-secondary/30 border-border/40 hover:bg-secondary/50'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details (optional)"
                  rows={3}
                  className="bg-secondary/30 text-sm resize-none"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!reason || submitting}
                  className="w-full gap-2"
                  variant="destructive"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  Submit Report
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
