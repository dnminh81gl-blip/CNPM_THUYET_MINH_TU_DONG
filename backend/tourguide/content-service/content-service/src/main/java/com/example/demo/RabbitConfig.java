package com.example.demo;

import org.springframework.amqp.core.ExchangeBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình RabbitMQ phía GỬI.
 * Exchange "tourguide.events" kiểu TOPIC: bên gửi chỉ cần nói "sự kiện này tên là X" (routing key),
 * RabbitMQ tự chuyển tới những hàng đợi đã đăng ký nhận X.
 */
@Configuration
public class RabbitConfig {

    /** Tên exchange chung của cả hệ thống (mọi service dùng cùng tên này). */
    public static final String EXCHANGE = "tourguide.events";

    /** Routing key của sự kiện nội dung vừa được xuất bản. */
    public static final String RK_CONTENT_PUBLISHED = "content.published";

    @Bean
    TopicExchange eventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE).durable(true).build();
    }

    /** Tin nhắn gửi đi dưới dạng JSON (thay vì dạng nhị phân khó đọc). */
    @Bean
    MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
