package com.tourguide.notification.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Cho phép gửi thông báo từ Server về Client qua các endpoint bắt đầu bằng /topic
        config.enableSimpleBroker("/topic");
        // Các yêu cầu gửi dữ liệu từ Client lên Server sẽ bắt đầu bằng /app
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint để Frontend kết nối WebSocket (kèm hỗ trợ SockJS làm fallback)
        registry.addEndpoint("/ws-notification")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}