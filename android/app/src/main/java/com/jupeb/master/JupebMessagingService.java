package com.jupeb.master;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Delivers data-only chat pushes as native Android notifications. Data-only
 * FCM is intentional: it lets the app add the same inline Reply and Mark as
 * read actions while the WebView is stopped or the app process is cold.
 */
public class JupebMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "messages";
    private static final String EXTRA_REPLY_TEXT = "jupeb_notification_reply";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        // Keep Capacitor's JS event path alive for the in-app banner/realtime UI.
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        if (!"chat".equals(data.get("type")) || MainActivity.isAppForeground) {
            return;
        }

        String conversationId = data.get("conversation_id");
        if (conversationId == null || conversationId.trim().isEmpty()) return;

        String title = data.get("title");
        String body = data.get("body");
        String messageId = data.get("message_id");
        String replyToken = data.get("reply_token");
        String readToken = data.get("read_token");

        showChatNotification(
            conversationId,
            messageId == null ? "" : messageId,
            title == null || title.trim().isEmpty() ? "New message" : title,
            body == null ? "You received a message" : body,
            replyToken,
            readToken
        );
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Messages",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("New chat messages");
        channel.enableVibration(true);
        channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(channel);
    }

    private void showChatNotification(
        String conversationId,
        String messageId,
        String title,
        String body,
        String replyToken,
        String readToken
    ) {
        ensureChannel();
        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        Intent openIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (openIntent == null) return;
        openIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openIntent.putExtra("google.message_id", "jupeb-" + messageId);
        openIntent.putExtra("type", "chat");
        openIntent.putExtra("conversation_id", conversationId);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            safeRequestCode(conversationId + "-open"),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_rutex)
            .setColor(Color.rgb(225, 146, 9))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setContentIntent(contentIntent)
            .setGroup(conversationId);

        if (replyToken != null && !replyToken.isEmpty()) {
            Intent replyIntent = new Intent(this, NotificationActionReceiver.class);
            replyIntent.setAction(NotificationActionReceiver.ACTION_REPLY);
            replyIntent.putExtra(NotificationActionReceiver.EXTRA_ACTION, "reply");
            replyIntent.putExtra(NotificationActionReceiver.EXTRA_TOKEN, replyToken);
            replyIntent.putExtra(NotificationActionReceiver.EXTRA_CONVERSATION_ID, conversationId);
            PendingIntent replyPendingIntent = PendingIntent.getBroadcast(
                this,
                safeRequestCode(replyToken),
                replyIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );
            RemoteInput remoteInput = new RemoteInput.Builder(EXTRA_REPLY_TEXT)
                .setLabel("Write a reply")
                .setAllowFreeFormInput(true)
                .build();
            NotificationCompat.Action replyAction = new NotificationCompat.Action.Builder(
                R.drawable.ic_stat_rutex,
                "Reply",
                replyPendingIntent
            )
                .addRemoteInput(remoteInput)
                .setAllowGeneratedReplies(true)
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY)
                .build();
            builder.addAction(replyAction);
        }

        if (readToken != null && !readToken.isEmpty()) {
            Intent readIntent = new Intent(this, NotificationActionReceiver.class);
            readIntent.setAction(NotificationActionReceiver.ACTION_MARK_READ);
            readIntent.putExtra(NotificationActionReceiver.EXTRA_ACTION, "read");
            readIntent.putExtra(NotificationActionReceiver.EXTRA_TOKEN, readToken);
            readIntent.putExtra(NotificationActionReceiver.EXTRA_CONVERSATION_ID, conversationId);
            PendingIntent readPendingIntent = PendingIntent.getBroadcast(
                this,
                safeRequestCode(readToken),
                readIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.addAction(new NotificationCompat.Action.Builder(
                R.drawable.ic_stat_rutex,
                "Mark as read",
                readPendingIntent
            ).build());
        }

        // One notification per conversation, matching WhatsApp's replacement
        // behavior when several messages arrive in the same chat.
        manager.notify(conversationId, 0, builder.build());
    }

    private int safeRequestCode(String value) {
        return value.hashCode() & 0x7fffffff;
    }
}
