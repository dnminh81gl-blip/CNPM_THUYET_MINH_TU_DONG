package com.tourguide.narration_service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

/** Cho DUY NHAT trong service nay gui tin len RabbitMQ. */
@Service
public class EventPublisher {

    private static final Logger log = LoggerFactory.getLogger(EventPublisher.class);
    private final RabbitTemplate rabbit;

    public EventPublisher(RabbitTemplate rabbit) {
        this.rabbit = rabbit;
    }

    public void publish(String routingKey, Object event) {
        rabbit.convertAndSend(RabbitConfig.EXCHANGE, routingKey, event);
        log.info("[narration-service] Da gui su kien '{}': {}", routingKey, event);
    }
}
