package com.tourguide.notification.config;

import org.springframework.amqp.core.Queue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.queue.audio-ready:audio.ready}")
    private String audioReadyQueue;

    @Value("${rabbitmq.queue.translation-completed:translation.completed}")
    private String translationCompletedQueue;

    @Bean
    public Queue audioReadyQueue() {
        return new Queue(audioReadyQueue, true);
    }

    @Bean
    public Queue translationCompletedQueue() {
        return new Queue(translationCompletedQueue, true);
    }
}