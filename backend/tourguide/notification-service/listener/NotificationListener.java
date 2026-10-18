package com.tourguide.notification.listener;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class NotificationListener {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Lắng nghe sự kiện audio.ready từ RabbitMQ
    @RabbitListener(queues = "${rabbitmq.queue.audio-ready:audio.ready}")
    public void handleAudioReadyEvent(String message) {
        System.out.println("[Notification Service] Nhận sự kiện audio.ready: " + message);
        
        // Bắn thông báo thời gian thực về cho Client qua WebSocket channel /topic/notifications
        messagingTemplate.convertAndSend("/topic/notifications", message);
    }

    // Lắng nghe sự kiện translation.completed từ RabbitMQ
    @RabbitListener(queues = "${rabbitmq.queue.translation-completed:translation.completed}")
    public void handleTranslationCompletedEvent(String message) {
        System.out.println("[Notification Service] Nhận sự kiện translation.completed: " + message);
        
        // Bắn thông báo về cho Client qua WebSocket channel /topic/notifications
        messagingTemplate.convertAndSend("/topic/notifications", message);
    }
}