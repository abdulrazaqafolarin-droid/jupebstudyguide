import { supabase } from '@/integrations/supabase/client';

export async function sendPush(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: { user_id: userId, title, body, data },
    });
    if (error) console.error('send-push error:', error);
  } catch (e) {
    console.error('send-push failed:', e);
  }
}
