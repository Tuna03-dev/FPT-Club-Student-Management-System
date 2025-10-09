package com.sep490.backendclubmanagement.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenBlacklistService {

    private final Map<String, Long> revokedJtiToExpiryMs = new ConcurrentHashMap<>();

    public void revoke(String jti, long expiresAtMillis) {
        if (jti == null) return;
        revokedJtiToExpiryMs.put(jti, expiresAtMillis);
        cleanup();
    }

    public boolean isRevoked(String jti) {
        if (jti == null) return false;
        Long exp = revokedJtiToExpiryMs.get(jti);
        if (exp == null) return false;
        if (exp < System.currentTimeMillis()) {
            revokedJtiToExpiryMs.remove(jti);
            return false;
        }
        return true;
    }

    private void cleanup() {
        long now = System.currentTimeMillis();
        revokedJtiToExpiryMs.entrySet().removeIf(e -> e.getValue() < now);
    }
}


