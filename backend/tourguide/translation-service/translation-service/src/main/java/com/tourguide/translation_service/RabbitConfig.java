package com.tourguide.translation_service;

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

/** Cau hinh RabbitMQ cua translation-service: nhan narration.created, phat translation.completed. */
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "tourguide.events";
    public static final String RK_NARRATION_CREATED = "narration.created";
    public static final String RK_TRANSLATION_COMPLETED = "translation.completed";
    public static final String QUEUE_NARRATION_CREATED = "translation-service.narration.created";

    @Bean
    TopicExchange eventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE).durable(true).build();
    }

    @Bean
    Queue narrationCreatedQueue() {
        return QueueBuilder.durable(QUEUE_NARRATION_CREATED).build();
    }

    @Bean
    Binding narrationCreatedBinding(Queue narrationCreatedQueue, TopicExchange eventsExchange) {
        return BindingBuilder.bind(narrationCreatedQueue).to(eventsExchange).with(RK_NARRATION_CREATED);
    }

    @Bean
    MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
