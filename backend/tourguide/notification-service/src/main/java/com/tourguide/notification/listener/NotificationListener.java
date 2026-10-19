package com.tourguide.notification.listener;

import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.tourguide.notification.config.RabbitMQConfig;

/**
 * Nhan su kien tu RabbitMQ va day thong bao thoi gian thuc ve Client qua WebSocket.
 * Kenh WebSocket: /topic/notifications
 * Noi dung gui ve: {"type":"<routing_key>","data":<JSON goc cua su kien>}
 */
@Component
public class NotificationListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationListener.class);
    public static final String TOPIC = "/topic/notifications";

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // Lắng nghe sự kiện translation.completed (do translation-service phát)
    @RabbitListener(queues = RabbitMQConfig.QUEUE_TRANSLATION_COMPLETED)
    public void handleTranslationCompletedEvent(Message message) {
        forward(RabbitMQConfig.RK_TRANSLATION_COMPLETED, message);
    }

    // Lắng nghe sự kiện audio.ready (do tts-service phát, sẽ làm sau)
    @RabbitListener(queues = RabbitMQConfig.QUEUE_AUDIO_READY)
    public void handleAudioReadyEvent(Message message) {
        forward(RabbitMQConfig.RK_AUDIO_READY, message);
    }

    /* Doc noi dung tin nhan duoi dang chuoi UTF-8 (cac service khac gui JSON, content-type application/json)
       roi boc lai kem loai su kien de Frontend phan biet. */
    void forward(String type, Message message) {
        String body = message.getBody() == null ? "" : new String(message.getBody(), StandardCharsets.UTF_8).trim();
        String data = looksLikeJson(body) ? body : quote(body);
        String payload = "{\"type\":\"" + type + "\",\"data\":" + data + "}";
        log.info("[notification-service] Nhan '{}' -> gui WebSocket {}: {}", type, TOPIC, body);
        messagingTemplate.convertAndSend(TOPIC, payload);
    }

    private static boolean looksLikeJson(String s) {
        return (s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"));
    }

    private static String quote(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        return sb.append('"').toString();
    }
}
