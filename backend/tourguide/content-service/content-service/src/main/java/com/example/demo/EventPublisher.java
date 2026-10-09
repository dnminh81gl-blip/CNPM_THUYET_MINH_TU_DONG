package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

/** Chỗ DUY NHẤT trong service này gửi tin lên RabbitMQ (dễ thay đổi, dễ kiểm thử về sau). */
@Service
public class EventPublisher {

    private static final Logger log = LoggerFactory.getLogger(EventPublisher.class);

    private final RabbitTemplate rabbit;

    public EventPublisher(RabbitTemplate rabbit) {
        this.rabbit = rabbit;
    }

    public void publish(String routingKey, Object event) {
        rabbit.convertAndSend(RabbitConfig.EXCHANGE, routingKey, event);
        log.info("[content-service] Đã gửi sự kiện '{}' lên exchange '{}': {}", routingKey, RabbitConfig.EXCHANGE, event);
    }
}
