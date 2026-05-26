import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface Envelope {
  action: string;
  payload: Record<string, unknown>;
}

serve(async (req: Request) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
  if (req.method === "OPTIONS") return new Response(null { headers });

  try {
    const auth = req.headers.get("Authorization");
    const token = auth?.replace("Bearer ", "");
    if (!token) throw new Error("Missing authorization");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, payload }: Envelope = await req.json();

    switch (action) {
      case "get-conversations": return handleGetConversations(supabase, user.id, headers);
      case "get-messages": return handleGetMessages(supabase, user.id, payload, headers);
      case "send-message": return handleSendMessage(supabase, user.id, payload, headers);
      case "edit-message": return handleEditMessage(supabase, user.id, payload, headers);
      case "delete-message": return handleDeleteMessage(supabase, user.id, payload, headers);
      case "upsert-reaction": return handleUpsertReaction(supabase, user.id, payload, headers);
      case "remove-reaction": return handleRemoveReaction(supabase, user.id, payload, headers);
      case "star-message": return handleStarMessage(supabase, user.id, payload, headers);
      case "unstar-message": return handleUnstarMessage(supabase, user.id, payload, headers);
      case "get-starred": return handleGetStarred(supabase, user.id, payload, headers);
      case "search-users": return handleSearchUsers(supabase, user.id, payload, headers);
      case "block-user": return handleBlockUser(supabase, user.id, payload, headers);
      case "unblock-user": return handleUnblockUser(supabase, user.id, payload, headers);
      default: throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: msg, code: "ERROR" }), { status: 400, headers });
  }
});

async function handleGetConversations(supabase, userId: string, headers: HeadersInit) {
  const { data: convs } = await supabase
    .from("direct_conversations")
    .select("*")
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (!convs) return json({ conversations: [] }, headers);

  const otherIds = convs.map((c: any) => c.participant_a === userId ? c.participant_b : c.participant_a);
  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", otherIds);
  const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));

  const enriched = await Promise.all(convs.map(async (c: any) => {
    const oid = c.participant_a === userId ? c.participant_b : c.participant_a;
    const p = pmap.get(oid);
    const { count } = await supabase.rpc("get_unread_count", {
      p_conversation_id: c.id, p_user_id: userId,
    });
    const { data: lm } = await supabase
      .from("direct_messages")
      .select("type, sent_at")
      .eq("conversation_id", c.id)
      .eq("is_deleted", false)
      .order("sent_at", { ascending: false })
      .limit(1);
    return {
      id: c.id,
      other_user: { id: oid, display_name: p?.display_name, avatar_url: p?.avatar_url },
      last_message: lm?.[0] ? { type: lm[0].type, sent_at: lm[0].sent_at } : null,
      unread_count: count ?? 0,
      updated_at: c.updated_at,
    };
  }));

  return json({ conversations: enriched }, headers);
}

async function handleGetMessages(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const convId = payload.conversation_id as string;
  const before = payload.before as number | undefined;
  const limit = Math.min((payload.limit as number) ?? 50, 100);

  if (!convId) throw new Error("conversation_id required");

  const { data: conv } = await supabase
    .from("direct_conversations")
    .select("id")
    .eq("id", convId)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .single();
  if (!conv) throw new Error("Conversation not found");

  let query = supabase
    .from("direct_messages")
    .select("*")
    .eq("conversation_id", convId)
    .eq("is_deleted", false)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("id", before);

  const { data: msgs } = await query;
  return json({ messages: msgs || [] }, headers);
}

async function handleSendMessage(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const { conversation_id, client_msg_id, type, ciphertext, media_url, media_meta, reply_to_id, view_once, forwarded_hops } = payload;

  if (!conversation_id || !client_msg_id || !type || !ciphertext) {
    throw new Error("Missing required fields: conversation_id, client_msg_id, type, ciphertext");
  }

  const { data: conv } = await supabase
    .from("direct_conversations")
    .select("id")
    .eq("id", conversation_id as string)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .single();
  if (!conv) throw new Error("Conversation not found");

  const { data: existing } = await supabase
    .from("direct_messages")
    .select("id")
    .eq("client_msg_id", client_msg_id as string)
    .maybeSingle();
  if (existing) return json({ message: existing, deduplicated: true }, headers);

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      client_msg_id: client_msg_id as string,
      conversation_id: conversation_id as string,
      sender_id: userId,
      type: type as string,
      ciphertext: ciphertext as string,
      media_url: (media_url as string) ?? null,
      media_meta,
      reply_to_id: reply_to_id ? Number(reply_to_id) : null,
      view_once: !!view_once,
      forwarded_hops: Math.min(Number(forwarded_hops ?? 0), 5),
      state: "sent",
    })
    .select()
    .single();

  if (error) throw error;
  return json({ message: data }, headers);
}

async function handleEditMessage(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const messageId = Number(payload.message_id);
  const ciphertext = payload.ciphertext as string;

  if (!messageId || !ciphertext) throw new Error("message_id and ciphertext required");

  const { data: msg } = await supabase
    .from("direct_messages")
    .select("id, sent_at, ciphertext")
    .eq("id", messageId)
    .eq("sender_id", userId)
    .single();
  if (!msg) throw new Error("Message not found or not yours");

  const elapsed = Date.now() - new Date(msg.sent_at).getTime();
  if (elapsed > 15 * 60 * 1000) throw new Error("Edit window expired (15 min)");

  const { error } = await supabase
    .from("direct_messages")
    .update({ ciphertext, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) throw error;

  await supabase.from("message_edits").insert({
    message_id: messageId,
    old_cipher: msg.ciphertext,
  });

  return json({ success: true }, headers);
}

async function handleDeleteMessage(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const messageId = Number(payload.message_id);
  const scope = (payload.scope as string) ?? "everyone";

  if (!messageId) throw new Error("message_id required");

  if (scope === "everyone") {
    await supabase.from("direct_messages").update({ is_deleted: true }).eq("id", messageId).eq("sender_id", userId);
  } else {
    await supabase.from("direct_messages").update({ is_deleted: true }).eq("id", messageId).eq("sender_id", userId);
  }

  return json({ success: true }, headers);
}

async function handleUpsertReaction(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const messageId = Number(payload.message_id);
  const emoji = payload.emoji as string;

  if (!messageId || !emoji) throw new Error("message_id and emoji required");

  const { data, error } = await supabase
    .from("direct_reactions")
    .upsert(
      { message_id: messageId, user_id: userId, emoji },
      { onConflict: "message_id, user_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return json({ reaction: data }, headers);
}

async function handleRemoveReaction(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const messageId = Number(payload.message_id);
  if (!messageId) throw new Error("message_id required");

  await supabase.from("direct_reactions").delete().eq("message_id", messageId).eq("user_id", userId);
  return json({ success: true }, headers);
}

async function handleStarMessage(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const messageId = Number(payload.message_id);
  if (!messageId) throw new Error("message_id required");

  await supabase.from("starred_messages").upsert(
    { user_id: userId, message_id: messageId },
    { onConflict: "user_id, message_id" },
  );
  return json({ success: true }, headers);
}

async function handleUnstarMessage(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const messageId = Number(payload.message_id);
  if (!messageId) throw new Error("message_id required");

  await supabase.from("starred_messages").delete().eq("user_id", userId).eq("message_id", messageId);
  return json({ success: true }, headers);
}

async function handleGetStarred(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const convId = payload.conversation_id as string | undefined;
  let query = supabase
    .from("starred_messages")
    .select("*, direct_messages!inner(*)")
    .eq("user_id", userId);

  if (convId) query = query.eq("direct_messages.conversation_id", convId);

  const { data } = await query.order("starred_at", { ascending: false });
  return json({ starred: data || [] }, headers);
}

async function handleSearchUsers(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const q = (payload.q as string)?.trim();
  if (!q || q.length < 2) return json({ users: [] }, headers);

  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .neq("user_id", userId)
    .or(`display_name.ilike.%${q}%`);

  return json({ users: (data || []).slice(0, 20) }, headers);
}

async function handleBlockUser(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const blockedId = payload.user_id as string;
  if (!blockedId) throw new Error("user_id required");

  await supabase.from("blocked_users").insert({ blocker_id: userId, blocked_id: blockedId });
  return json({ success: true }, headers);
}

async function handleUnblockUser(supabase, userId: string, payload: Record<string, unknown>, headers: HeadersInit) {
  const blockedId = payload.user_id as string;
  if (!blockedId) throw new Error("user_id required");

  await supabase.from("blocked_users").delete().eq("blocker_id", userId).eq("blocked_id", blockedId);
  return json({ success: true }, headers);
}

function json(data: unknown, headers: HeadersInit) {
  return new Response(JSON.stringify(data), { status: 200, headers });
}
