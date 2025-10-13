package com.sep490.backendclubmanagement.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.GoogleLoginRequest;
import com.sep490.backendclubmanagement.dto.request.RefreshTokenRequest;
import com.sep490.backendclubmanagement.dto.response.AuthenticationResponse;
import com.sep490.backendclubmanagement.entity.SystemRole;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.repository.SystemRoleRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import com.sep490.backendclubmanagement.service.AllowedUserService;
import com.sep490.backendclubmanagement.service.TokenBlacklistService;
import com.sep490.backendclubmanagement.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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
    private final UserRepository userRepository;
    private final SystemRoleRepository systemRoleRepository;
    private final TokenBlacklistService tokenBlacklistService;

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
        org.springframework.security.core.userdetails.User securityUser = new org.springframework.security.core.userdetails.User(email, "N/A", authorities);

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("fullName", fullName);
        extraClaims.put("avatarUrl", avatarUrl);
        extraClaims.put("systemRole", systemRole);

        // Upsert user into DB if not exists
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setEmail(email);
            u.setFullName(fullName);
            u.setAvatarUrl(avatarUrl);
            u.setProvider("GOOGLE");
            return u;
        });
        // ensure system role entity
//        SystemRole role = systemRoleRepository.findByRoleName(systemRole)
//                .orElseGet(() -> systemRoleRepository.save(SystemRole.builder().roleName(systemRole).build()));
//        user.setSystemRole(role);
//        user.setFullName(fullName);
//        user.setAvatarUrl(avatarUrl);
//        user = userRepository.save(user);

        String accessToken = jwtUtil.generateAccessToken(extraClaims, securityUser);
        String refreshToken = jwtUtil.generateRefreshToken(securityUser);

        AuthenticationResponse.UserInfo userInfo = AuthenticationResponse.UserInfo.builder()
                .id(user.getId())
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

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        String email = jwtUtil.extractUsername(refreshToken);
        List<String> authorities = jwtUtil.extractAuthorities(refreshToken);
        String systemRole = authorities.stream().findFirst().orElse("ROLE_STUDENT").replace("ROLE_", "");

        // if revoked or expired will throw/validate later
        org.springframework.security.core.userdetails.User securityUser = new org.springframework.security.core.userdetails.User(
                email,
                "N/A",
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + systemRole))
        );

        Map<String, Object> extraClaims = new HashMap<>();
        userRepository.findByEmail(email).ifPresent(u -> {
            extraClaims.put("fullName", u.getFullName());
            extraClaims.put("avatarUrl", u.getAvatarUrl());
            extraClaims.put("systemRole", u.getSystemRole() != null ? u.getSystemRole().getRoleName() : systemRole);
        });

        String newAccessToken = jwtUtil.generateAccessToken(extraClaims, securityUser);

        AuthenticationResponse auth = AuthenticationResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.extractExpiration(newAccessToken).toInstant().toEpochMilli() - java.time.Instant.now().toEpochMilli())
                .user(AuthenticationResponse.UserInfo.builder()
                        .id(userRepository.findByEmail(email).map(User::getId).orElse(null))
                        .email(email)
                        .fullName((String) extraClaims.getOrDefault("fullName", ""))
                        .avatarUrl((String) extraClaims.getOrDefault("avatarUrl", ""))
                        .systemRole((String) extraClaims.getOrDefault("systemRole", systemRole))
                        .build())
                .build();

        return ResponseEntity.ok(ApiResponse.success(auth));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, String> body) {
        
        // Revoke access token
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);
            String jti = jwtUtil.extractJti(token);
            long exp = jwtUtil.extractExpiration(token).getTime();
            tokenBlacklistService.revoke(jti, exp);
        }
        
        // Revoke refresh token if provided
        if (body != null && body.containsKey("refreshToken")) {
            String refreshToken = body.get("refreshToken");
            String refreshJti = jwtUtil.extractJti(refreshToken);
            long refreshExp = jwtUtil.extractExpiration(refreshToken).getTime();
            tokenBlacklistService.revoke(refreshJti, refreshExp);
        }
        
        return ResponseEntity.ok(ApiResponse.success(null));
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


