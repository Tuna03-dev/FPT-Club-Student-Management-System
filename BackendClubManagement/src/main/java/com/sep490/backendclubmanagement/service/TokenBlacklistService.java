package com.sep490.backendclubmanagement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String REVOKED_TOKEN_PREFIX = "revoked:token:";

    /**
     * Revoke a token by adding its JTI to Redis with TTL
     * @param jti JWT ID from token
     * @param expiresAtMillis Token expiration time in milliseconds
     */
    public void revoke(String jti, long expiresAtMillis) {
        if (jti == null) return;
        
        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String key = REVOKED_TOKEN_PREFIX + jti;
                long currentTime = System.currentTimeMillis();
                long ttlSeconds = Math.max(1, (expiresAtMillis - currentTime) / 1000);
                
                // Set key with TTL = time remaining until token expires
                redisTemplate.opsForValue().set(key, "revoked", Duration.ofSeconds(ttlSeconds));
                log.debug("Token revoked successfully: jti={}, ttl={}s, attempt={}", jti, ttlSeconds, attempt);
                return; // Success, exit retry loop
            } catch (Exception e) {
                log.warn("Failed to revoke token (attempt {}/{}): jti={}, error={}", 
                    attempt, maxRetries, jti, e.getMessage());
                
                if (attempt == maxRetries) {
                    log.error("Failed to revoke token after {} attempts: jti={}", maxRetries, jti, e);
                } else {
                    try {
                        Thread.sleep(100 * attempt); // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
    }

    /**
     * Check if a token is revoked
     * @param jti JWT ID from token
     * @return true if token is revoked, false otherwise
     */
    public boolean isRevoked(String jti) {
        if (jti == null) return false;
        
        try {
            String key = REVOKED_TOKEN_PREFIX + jti;
            Boolean exists = redisTemplate.hasKey(key);
            boolean revoked = Boolean.TRUE.equals(exists);
            
            if (revoked) {
                log.debug("Token found in blacklist: jti={}", jti);
            }
            
            return revoked;
        } catch (Exception e) {
            log.error("Failed to check token revocation status: jti={}", jti, e);
            // Fail-safe: if Redis is down, don't block authentication
            return false;
        }
    }

    /**
     * Force revoke a token immediately (useful for admin operations)
     * @param jti JWT ID from token
     */
    public void forceRevoke(String jti) {
        if (jti == null) return;
        
        try {
            String key = REVOKED_TOKEN_PREFIX + jti;
            // Set with long TTL (7 days) to ensure it stays revoked
            redisTemplate.opsForValue().set(key, "force-revoked", Duration.ofDays(7));
            log.info("Token force revoked: jti={}", jti);
        } catch (Exception e) {
            log.error("Failed to force revoke token: jti={}", jti, e);
        }
    }
}


