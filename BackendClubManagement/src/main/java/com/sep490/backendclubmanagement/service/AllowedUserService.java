package com.sep490.backendclubmanagement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AllowedUserService {

    @Value("${auth.allowed-users-api-url}")
    private String allowedUsersApiUrl;

    private final RestClient restClient = RestClient.builder().build();

    public Optional<Map<String, Object>> findProfileByEmail(String email) {
        if (email == null || email.isBlank()) return Optional.empty();
        if (allowedUsersApiUrl == null || allowedUsersApiUrl.isBlank()) return Optional.empty();
        try {
            Map profile = restClient.post()
                    .uri(allowedUsersApiUrl + "/verify")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(Map.of("email", email))
                    .retrieve()
                    .body(Map.class);
            //noinspection unchecked
            return Optional.ofNullable((Map<String, Object>) profile);
        } catch (Exception e) {
            log.warn("Email {} not allowed or verification failed", email);
            return Optional.empty();
        }
    }
}


