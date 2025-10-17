package com.sep490.backendclubmanagement.config;

import com.sep490.backendclubmanagement.service.RefreshTokenService;
import com.sep490.backendclubmanagement.service.TokenBlacklistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TokenCleanupScheduler {

    private final RefreshTokenService refreshTokenService;
    private final TokenBlacklistService tokenBlacklistService;

    /**
     * Clean up expired refresh tokens every hour
     */
    @Scheduled(fixedRate = 3600000) // Run every hour
    public void cleanupExpiredRefreshTokens() {
        try {
            log.info("Starting refresh token cleanup...");
            refreshTokenService.cleanupExpiredTokens();
            log.info("Refresh token cleanup completed");
        } catch (Exception e) {
            log.error("Error during refresh token cleanup", e);
        }
    }

    /**
     * Clean up expired blacklisted tokens every hour
     */
    @Scheduled(fixedRate = 3600000) // Run every hour
    public void cleanupExpiredBlacklistedTokens() {
        try {
            log.info("Starting blacklisted token cleanup...");
            tokenBlacklistService.cleanupExpiredTokens();
            log.info("Blacklisted token cleanup completed");
        } catch (Exception e) {
            log.error("Error during blacklisted token cleanup", e);
        }
    }
}

