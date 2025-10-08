package com.sep490.backendclubmanagement.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AllowedUserService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${auth.allowed-users-json}")
    private Resource allowedUsersResource;

    @Getter
    private final Map<String, Map<String, Object>> emailToProfile = new HashMap<>();

    @PostConstruct
    public void loadAllowedUsers() {
        if (allowedUsersResource == null) {
            log.warn("Allowed users resource not configured");
            return;
        }
        try {
            List<Map<String, Object>> users = objectMapper.readValue(
                    allowedUsersResource.getInputStream(), new TypeReference<List<Map<String, Object>>>() {}
            );
            emailToProfile.clear();
            for (Map<String, Object> user : users) {
                Object email = user.get("email");
                if (email instanceof String emailStr) {
                    emailToProfile.put(emailStr.toLowerCase(), user);
                }
            }
            log.info("Loaded {} allowed users from JSON", emailToProfile.size());
        } catch (IOException e) {
            log.error("Failed to load allowed users JSON", e);
        }
    }

    public Optional<Map<String, Object>> findProfileByEmail(String email) {
        if (email == null) return Optional.empty();
        return Optional.ofNullable(emailToProfile.get(email.toLowerCase()));
    }
}


