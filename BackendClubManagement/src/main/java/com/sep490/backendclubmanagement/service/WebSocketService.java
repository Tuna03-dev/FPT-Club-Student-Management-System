package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.websocket.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public <T> void sendToUser(String username, String type, String action, T payload) {
        try {
            WebSocketMessage<T> message = WebSocketMessage.of(type, action, payload);
            messagingTemplate.convertAndSendToUser(
                username,
                "/queue/messages",
                message
            );
            log.info("Sent message to user: {}, type: {}, action: {}", username, type, action);
        } catch (Exception e) {
            log.error("Failed to send message to user: {}", username, e);
        }
    }
    public void sendPaymentSuccess(String username, PaymentWebSocketPayload payload) {
        sendToUser(username,
            WebSocketMessageType.PAYMENT.name(),
            WebSocketMessageAction.SUCCESS.name(),
            payload
        );
    }
    public void sendPaymentFailed(String username, PaymentWebSocketPayload payload) {
        sendToUser(username,
            WebSocketMessageType.PAYMENT.name(),
            WebSocketMessageAction.FAILED.name(),
            payload
        );
    }
    public void sendNotificationToUser(String username, NotificationWebSocketPayload payload) {
        sendToUser(username,
            WebSocketMessageType.NOTIFICATION.name(),
            WebSocketMessageAction.INFO.name(),
            payload
        );
    }
    public <T> void broadcastToClub(Long clubId, String type, String action, T payload) {
        try {
            WebSocketMessage<T> message = WebSocketMessage.of(type, action, payload);
            messagingTemplate.convertAndSend(
                "/topic/club/" + clubId,
                message
            );
            log.info("Broadcast to club: {}, type: {}, action: {}", clubId, type, action);
        } catch (Exception e) {
            log.error("Failed to broadcast to club: {}", clubId, e);
        }
    }
    public <T> void broadcastToClubRole(Long clubId, String roleName, String type, String action, T payload) {
        try {
            WebSocketMessage<T> message = WebSocketMessage.of(type, action, payload);
            messagingTemplate.convertAndSend(
                "/topic/club/" + clubId + "/role/" + roleName,
                message
            );
            log.info("Broadcast to club: {}, role: {}, type: {}", clubId, roleName, type);
        } catch (Exception e) {
            log.error("Failed to broadcast to club role: {}", clubId, e);
        }
    }
    public <T> void broadcastToSystemRole(String systemRole, String type, String action, T payload) {
        try {
            WebSocketMessage<T> message = WebSocketMessage.of(type, action, payload);
            messagingTemplate.convertAndSend(
                "/topic/system/role/" + systemRole,
                message
            );
            log.info("Broadcast to system role: {}, type: {}", systemRole, type);
        } catch (Exception e) {
            log.error("Failed to broadcast to system role: {}", systemRole, e);
        }
    }
    public <T> void broadcastToTeam(Long teamId, String type, String action, T payload) {
        try {
            WebSocketMessage<T> message = WebSocketMessage.of(type, action, payload);
            messagingTemplate.convertAndSend(
                "/topic/team/" + teamId,
                message
            );
            log.info("Broadcast to team: {}, type: {}", teamId, type);
        } catch (Exception e) {
            log.error("Failed to broadcast to team: {}", teamId, e);
        }
    }
    public <T> void broadcastSystemWide(String type, String action, T payload) {
        try {
            WebSocketMessage<T> message = WebSocketMessage.of(type, action, payload);
            messagingTemplate.convertAndSend("/topic/system/all", message);
            log.info("System-wide broadcast: type: {}, action: {}", type, action);
        } catch (Exception e) {
            log.error("Failed to broadcast system-wide message", e);
        }
    }
    public <T> void sendToMultipleUsers(List<String> usernames, String type, String action, T payload) {
        WebSocketMessage<T> message = WebSocketMessage.of(type, action, payload);
        usernames.forEach(username -> {
            try {
                messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/messages",
                    message
                );
            } catch (Exception e) {
                log.error("Failed to send message to user: {}", username, e);
            }
        });
        log.info("Sent message to {} users, type: {}", usernames.size(), type);
    }
}
