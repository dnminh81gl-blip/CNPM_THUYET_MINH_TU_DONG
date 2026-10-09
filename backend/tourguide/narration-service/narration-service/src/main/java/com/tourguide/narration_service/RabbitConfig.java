package com.tourguide.narration_service;

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
 * Cấu hình RabbitMQ phía NHẬN.
 * Mỗi service có HÀNG ĐỢI RIÊNG của mình, rồi "đăng ký" nhận sự kiện bằng một BINDING:
 *   exchange "tourguide.events"  --(routing key "content.published")-->  queue "narration-service.content.published"
 * Nhờ vậy sau này có thêm service khác cũng muốn nghe content.published thì chỉ cần tạo hàng đợi riêng, không ảnh hưởng nhau.
 */
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "tourguide.events";
    public static final String RK_CONTENT_PUBLISHED = "content.published";
    public static final String QUEUE_CONTENT_PUBLISHED = "narration-service.content.published";

    @Bean
    TopicExchange eventsExchange() {
        // Khai báo lại exchange (giống hệt bên gửi): khai báo nhiều lần không sao, miễn là cấu hình giống nhau.
        return ExchangeBuilder.topicExchange(EXCHANGE).durable(true).build();
    }

    @Bean
    Queue contentPublishedQueue() {
        // durable: hàng đợi và tin nhắn không mất khi RabbitMQ khởi động lại
        return QueueBuilder.durable(QUEUE_CONTENT_PUBLISHED).build();
    }

    @Bean
    Binding contentPublishedBinding(Queue contentPublishedQueue, TopicExchange eventsExchange) {
        return BindingBuilder.bind(contentPublishedQueue).to(eventsExchange).with(RK_CONTENT_PUBLISHED);
    }

    /** Đọc tin nhắn JSON thành đối tượng Java. */
    @Bean
    MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
