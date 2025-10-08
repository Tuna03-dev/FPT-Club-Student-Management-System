package com.sep490.backendclubmanagement.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.GoogleLoginRequest;
import com.sep490.backendclubmanagement.dto.response.AuthenticationResponse;
import com.sep490.backendclubmanagement.service.AllowedUserService;
import com.sep490.backendclubmanagement.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Validated
@Slf4j
public class AuthController {

    private final AllowedUserService allowedUserService;
    private final JwtUtil jwtUtil;

    @Value("${google.client-id}")
    private String googleClientId;

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) throws Exception {
        GoogleIdToken.Payload payload = verifyIdToken(request.getIdToken());
        String email = payload.getEmail();

        Optional<Map<String, Object>> profileOpt = allowedUserService.findProfileByEmail(email);
        if (profileOpt.isEmpty()) {
            return ResponseEntity.status(403).body(ApiResponse.error(
                    com.sep490.backendclubmanagement.exception.ErrorCode.UNAUTHORIZED,
                    null
            ));
        }

        Map<String, Object> profile = profileOpt.get();
        String fullName = Objects.toString(profile.getOrDefault("fullName", payload.get("name")), "");
        String avatarUrl = Objects.toString(profile.getOrDefault("avatarUrl", payload.get("picture")), "");
        String systemRole = Objects.toString(profile.getOrDefault("systemRole", "STUDENT"));

        // Build a Spring Security user for token generation
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + systemRole));
        User securityUser = new User(email, "N/A", authorities);

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("fullName", fullName);
        extraClaims.put("avatarUrl", avatarUrl);
        extraClaims.put("systemRole", systemRole);

        String accessToken = jwtUtil.generateAccessToken(extraClaims, securityUser);
        String refreshToken = jwtUtil.generateRefreshToken(securityUser);

        AuthenticationResponse.UserInfo userInfo = AuthenticationResponse.UserInfo.builder()
                .id(null)
                .email(email)
                .fullName(fullName)
                .avatarUrl(avatarUrl)
                .systemRole(systemRole)
                .build();

        AuthenticationResponse auth = AuthenticationResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.extractExpiration(accessToken).toInstant().toEpochMilli() - Instant.now().toEpochMilli())
                .user(userInfo)
                .build();

        return ResponseEntity.ok(ApiResponse.success(auth));
    }

    private GoogleIdToken.Payload verifyIdToken(String idTokenString) throws Exception {
        var transport = GoogleNetHttpTransport.newTrustedTransport();
        var jsonFactory = JacksonFactory.getDefaultInstance();
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(transport, jsonFactory)
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(idTokenString);
        } catch (GeneralSecurityException | java.io.IOException e) {
            throw new RuntimeException("Failed to verify Google ID token", e);
        }
        if (idToken == null) {
            throw new RuntimeException("Invalid Google ID token");
        }
        return idToken.getPayload();
    }
}


