package com.jupeb.master;

import android.content.BroadcastReceiver;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import androidx.core.app.RemoteInput;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Redeems a short-lived recipient/action-scoped token for an inline reply/read. */
public class NotificationActionReceiver extends BroadcastReceiver {
    public static final String ACTION_REPLY = "com.jupeb.master.NOTIFICATION_REPLY";
    public static final String ACTION_MARK_READ = "com.jupeb.master.NOTIFICATION_MARK_READ";
    public static final String EXTRA_ACTION = "notification_action";
    public static final String EXTRA_TOKEN = "notification_action_token";
    public static final String EXTRA_CONVERSATION_ID = "conversation_id";
    private static final String EXTRA_REPLY_TEXT = "jupeb_notification_reply";

    private static final String ACTION_URL =
        "https://gzyczowqqywesqhqqpdi.supabase.co/functions/v1/notification-action";
    // Public Supabase publishable key only; authorization to act comes from
    // the unguessable, expiring, one-time token issued for this recipient.
    private static final String SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra(EXTRA_ACTION);
        String token = intent.getStringExtra(EXTRA_TOKEN);
        String conversationId = intent.getStringExtra(EXTRA_CONVERSATION_ID);
        if (token == null || token.isEmpty()) return;

        String content = null;
        if ("reply".equals(action)) {
            Bundle results = RemoteInput.getResultsFromIntent(intent);
            CharSequence reply = results == null ? null : results.getCharSequence(EXTRA_REPLY_TEXT);
            content = reply == null ? "" : reply.toString().trim();
            if (content.isEmpty() || content.length() > 2000) return;
        } else if (!"read".equals(action)) {
            return;
        }

        final String finalContent = content;
        final String finalAction = action;
        final String finalToken = token;
        final String finalConversationId = conversationId;
        final PendingResult pending = goAsync();

        EXECUTOR.execute(() -> {
            try {
                boolean success = redeemAction(finalToken, finalAction, finalContent);
                if (success && finalConversationId != null) {
                    NotificationManager manager = (NotificationManager)
                        context.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager != null) manager.cancel(finalConversationId, 0);
                }
            } catch (Exception ignored) {
                // Preserve the notification on transient failure so the user
                // can open the chat and send the reply normally.
            } finally {
                pending.finish();
            }
        });
    }

    private boolean redeemAction(String token, String action, String content) throws Exception {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(ACTION_URL).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("apikey", SUPABASE_PUBLISHABLE_KEY);

            JSONObject payload = new JSONObject();
            payload.put("token", token);
            payload.put("action", action);
            if ("reply".equals(action)) payload.put("content", content);

            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(bytes);
                output.flush();
            }
            int status = connection.getResponseCode();
            return (status >= 200 && status < 300) || status == 410;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
