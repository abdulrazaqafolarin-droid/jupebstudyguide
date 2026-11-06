package com.jupeb.master;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.List;
import java.util.Map;

/**
 * Data-only FCM receiver for native chat notifications.
 * Foreground messages continue through the in-app Realtime banner;
 * background messages are posted with Android inline RemoteInput actions.
 */
public final class ReplyNotificationService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "messages";
    private static final String EXTRA_CONVERSATION_ID = "conversation_id";
    private static final String EXTRA_MESSAGE_ID = "message_id";
    private static final String EXTRA_ACTION_TOKEN = "action_token";
    private static final String EXTRA_NOTIFICATION_TAG = "notification_tag";
    private static final String EXTRA_NOTIFICATION_ID = "notification_id";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        if (!"chat".equals(data.get("type")) || isAppForeground()) return;

        String conversationId = data.get(EXTRA_CONVERSATION_ID);
        String messageId = data.get(EXTRA_MESSAGE_ID);
        if (conversationId == null || conversationId.isEmpty()
                || messageId == null || messageId.isEmpty()) return;

        showChatNotification(
            data.get("title"),
            data.get("body"),
            conversationId,
            messageId,
            data.get("reply_token"),
            data.get("read_token")
        );
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }

    private boolean isAppForeground() {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (manager == null) return false;
        List<ActivityManager.RunningAppProcessInfo> processes = manager.getRunningAppProcesses();
        if (processes == null) return false;
        for (ActivityManager.RunningAppProcessInfo process : processes) {
            if (getPackageName().equals(process.processName)) {
                return process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND;
            }
        }
        return false;
    }

    private void ensureMessageChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "Messages", NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("New chat messages with quick reply and read actions");
        channel.enableVibration(true);
        channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(channel);
    }

    private void showChatNotification(
            String rawTitle, String rawBody, String conversationId,
            String messageId, String replyToken, String readToken) {
        ensureMessageChannel();
        String title = rawTitle == null || rawTitle.trim().isEmpty() ? "New message" : rawTitle.trim();
        String body = rawBody == null ? "Sent a message" : rawBody.trim();
        int notificationId = conversationId.hashCode();

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setAction("com.jupeb.master.OPEN_CHAT_NOTIFICATION");
        openIntent.setData(Uri.parse("jupeb://chat/" + conversationId + "/" + messageId));
        openIntent.putExtra("google.message_id", messageId);
        openIntent.putExtra("type", "chat");
        openIntent.putExtra(EXTRA_CONVERSATION_ID, conversationId);
        openIntent.putExtra(EXTRA_MESSAGE_ID, messageId);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this, notificationId, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_rutex)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setContentIntent(contentIntent);

        if (replyToken != null && !replyToken.isEmpty()) {
            Intent replyIntent = buildActionIntent(
                NotificationActionReceiver.ACTION_REPLY, replyToken, conversationId, notificationId
            );
            PendingIntent replyPendingIntent = PendingIntent.getBroadcast(
                this, notificationId * 31 + 1, replyIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );
            RemoteInput remoteInput = new RemoteInput.Builder(NotificationActionReceiver.KEY_REPLY_TEXT)
                .setLabel("Reply")
                .build();
            builder.addAction(new NotificationCompat.Action.Builder(
                android.R.drawable.ic_menu_send, "Reply", replyPendingIntent
            )
                .addRemoteInput(remoteInput)
                .setAllowGeneratedReplies(true)
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY)
                .build());
        }

        if (readToken != null && !readToken.isEmpty()) {
            Intent readIntent = buildActionIntent(
                NotificationActionReceiver.ACTION_MARK_READ, readToken, conversationId, notificationId
            );
            PendingIntent readPendingIntent = PendingIntent.getBroadcast(
                this, notificationId * 31 + 2, readIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.addAction(new NotificationCompat.Action.Builder(
                android.R.drawable.ic_menu_view, "Mark as read", readPendingIntent
            )
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_MARK_AS_READ)
                .build());
        }

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(conversationId, notificationId, builder.build());
    }

    private Intent buildActionIntent(
            String action, String token, String conversationId, int notificationId) {
        Intent intent = new Intent(this, NotificationActionReceiver.class);
        intent.setAction(action);
        intent.setData(Uri.parse("jupeb://notification-action/" + conversationId + "/" + action));
        intent.putExtra(EXTRA_ACTION_TOKEN, token);
        intent.putExtra(EXTRA_NOTIFICATION_TAG, conversationId);
        intent.putExtra(EXTRA_NOTIFICATION_ID, notificationId);
        return intent;
    }
}
