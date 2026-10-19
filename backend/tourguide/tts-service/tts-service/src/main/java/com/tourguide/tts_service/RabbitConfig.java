package com.tourguide.tts_service;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.ExchangeBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cau hinh RabbitMQ cua tts-service: nhan translation.completed, phat audio.ready.
 *   exchange "tourguide.events" --(translation.completed)--> queue "tts-service.translation.completed"
 * notification-service cung nghe translation.completed bang hang doi RIENG cua no, nen hai ben khong anh huong nhau.
 */
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "tourguide.events";
    public static final String RK_TRANSLATION_COMPLETED = "translation.completed";
    public static final String RK_AUDIO_READY = "audio.ready";
    public static final String QUEUE_TRANSLATION_COMPLETED = "tts-service.translation.completed";

    @Bean
    TopicExchange eventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE).durable(true).build();
    }

    @Bean
    Queue translationCompletedQueue() {
        return QueueBuilder.durable(QUEUE_TRANSLATION_COMPLETED).build();
    }

    @Bean
    Binding translationCompletedBinding(Queue translationCompletedQueue, TopicExchange eventsExchange) {
        return BindingBuilder.bind(translationCompletedQueue).to(eventsExchange).with(RK_TRANSLATION_COMPLETED);
    }

    /** Doc/ghi tin nhan dang JSON. */
    @Bean
    MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
