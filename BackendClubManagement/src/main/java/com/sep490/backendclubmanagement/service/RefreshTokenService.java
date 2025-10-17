package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;

/**
 * Simple service for managing refresh tokens in Redis.
 * Uses simple key-value structure: refresh_token:{userId} -> refreshTokenString
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";
    private static final long REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days

    /**
     * Store refresh token for user
     */
    public void storeRefreshToken(String userId, String refreshToken) {
        try {
            String key = REFRESH_TOKEN_PREFIX + userId;
            redisTemplate.opsForValue().set(key, refreshToken, Duration.ofDays(REFRESH_TOKEN_EXPIRY_DAYS));
            log.debug("Refresh token stored for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to store refresh token for user: {}", userId, e);
            throw new RuntimeException("Failed to store refresh token", e);
        }
    }

    /**
     * Get refresh token for user
     */
    public Optional<String> getRefreshToken(String userId) {
        try {
            String key = REFRESH_TOKEN_PREFIX + userId;
            String refreshToken = (String) redisTemplate.opsForValue().get(key);
            return Optional.ofNullable(refreshToken);
        } catch (Exception e) {
            log.error("Failed to get refresh token for user: {}", userId, e);
            return Optional.empty();
        }
    }

    /**
     * Check if user has a valid refresh token
     */
    public boolean hasValidRefreshToken(String userId) {
        return getRefreshToken(userId).isPresent();
    }

    /**
     * Validate refresh token for user
     */
    public boolean isValidRefreshToken(String userId, String refreshToken) {
        try {
            Optional<String> storedToken = getRefreshToken(userId);
            return storedToken.isPresent() && storedToken.get().equals(refreshToken);
        } catch (Exception e) {
            log.error("Failed to validate refresh token for user: {}", userId, e);
            return false;
        }
    }

    /**
     * Revoke refresh token for user
     */
    public void revokeRefreshToken(String userId) {
        try {
            String key = REFRESH_TOKEN_PREFIX + userId;
            redisTemplate.delete(key);
            log.info("Refresh token revoked for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to revoke refresh token for user: {}", userId, e);
        }
    }

    /**
     * Create and store refresh token for user
     */
    public void createRefreshToken(User user, String refreshToken) {
        storeRefreshToken(user.getId().toString(), refreshToken);
    }


    /**
     * Clean up expired tokens (scheduled task)
     */
    public void cleanupExpiredTokens() {
        try {
            Set<String> keys = redisTemplate.keys(REFRESH_TOKEN_PREFIX + "*");
            if (keys != null) {
                int cleanedCount = 0;
                for (String key : keys) {
                    try {
                        // Check if key exists (TTL should have removed it if expired)
                        Boolean exists = redisTemplate.hasKey(key);
                        if (Boolean.FALSE.equals(exists)) {
                            cleanedCount++;
                        }
                    } catch (Exception e) {
                        log.warn("Error checking key: {}", key, e);
                    }
                }
                if (cleanedCount > 0) {
                    log.info("Cleaned up {} expired refresh tokens", cleanedCount);
                }
            }
        } catch (Exception e) {
            log.error("Error during refresh token cleanup", e);
        }
    }

}