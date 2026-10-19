package com.tourguide.notification.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.ExchangeBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cau hinh RabbitMQ cua notification-service theo hop dong EVENTS.md:
 * - Exchange chung (topic, durable): tourguide.events
 * - Ten queue: <service_nhan>.<routing_key>
 * Queue PHAI duoc gan (bind) vao exchange thi moi nhan duoc su kien do service khac phat ra.
 */
@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "tourguide.events";

    public static final String RK_TRANSLATION_COMPLETED = "translation.completed";
    public static final String RK_AUDIO_READY = "audio.ready";

    public static final String QUEUE_TRANSLATION_COMPLETED = "notification-service." + RK_TRANSLATION_COMPLETED;
    public static final String QUEUE_AUDIO_READY = "notification-service." + RK_AUDIO_READY;

    @Bean
    TopicExchange eventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE).durable(true).build();
    }

    @Bean
    Queue translationCompletedQueue() {
        return QueueBuilder.durable(QUEUE_TRANSLATION_COMPLETED).build();
    }

    @Bean
    Queue audioReadyQueue() {
        return QueueBuilder.durable(QUEUE_AUDIO_READY).build();
    }

    @Bean
    Binding translationCompletedBinding(Queue translationCompletedQueue, TopicExchange eventsExchange) {
        return BindingBuilder.bind(translationCompletedQueue).to(eventsExchange).with(RK_TRANSLATION_COMPLETED);
    }

    @Bean
    Binding audioReadyBinding(Queue audioReadyQueue, TopicExchange eventsExchange) {
        return BindingBuilder.bind(audioReadyQueue).to(eventsExchange).with(RK_AUDIO_READY);
    }
}
