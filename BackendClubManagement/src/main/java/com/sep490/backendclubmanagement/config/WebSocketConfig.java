package com.sep490.backendclubmanagement.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@EnableWebSocketMessageBroker
@Configuration
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")                // FE connect vào /ws
                .setAllowedOriginPatterns("*")
                .withSockJS();                     // fallback
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // broker nội bộ. Khi scale nhiều instance thì chuyển sang broker relay (RabbitMQ/ActiveMQ/Redis)
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }
}
