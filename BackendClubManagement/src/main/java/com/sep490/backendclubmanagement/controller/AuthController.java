package com.sep490.backendclubmanagement.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.GoogleLoginRequest;
import com.sep490.backendclubmanagement.dto.request.RefreshTokenRequest;
import com.sep490.backendclubmanagement.dto.response.AuthenticationResponse;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.entity.SystemRole;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.service.FapApiService;
import com.sep490.backendclubmanagement.service.SystemRoleService;
import com.sep490.backendclubmanagement.service.TokenBlacklistService;
import com.sep490.backendclubmanagement.service.UserService;
import com.sep490.backendclubmanagement.service.RefreshTokenService;
import com.sep490.backendclubmanagement.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.security.GeneralSecurityException;
import java.util.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Validated
@Slf4j
public class AuthController {

    private final FapApiService fapApiServiceService;
    private final JwtUtil jwtUtil;
    private final UserService userService;
    private final SystemRoleService systemRoleService;
    private final TokenBlacklistService tokenBlacklistService;
    private final RefreshTokenService refreshTokenService;

    @Value("${google.client-id}")
    private String googleClientId;

    @PostMapping("/google")
    public ApiResponse<AuthenticationResponse> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request, HttpServletRequest httpRequest) {
        try {
            GoogleIdToken.Payload payload = verifyIdToken(request.getIdToken());
            String email = payload.getEmail();

            Optional<Map<String, Object>> profileOpt = fapApiServiceService.findProfileByEmail(email);
            if (profileOpt.isEmpty()) {
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }

            Map<String, Object> profile = profileOpt.get();
            String fullName = Objects.toString(profile.getOrDefault("fullName", payload.get("name")), "");
            String avatarUrl = Objects.toString(profile.getOrDefault("avatarUrl", payload.get("picture")), "");
            String studentCode = Objects.toString(profile.getOrDefault("studentCode", ""), "");
            String systemRole = Objects.toString(profile.getOrDefault("systemRole", "STUDENT"));

            // Ensure system role entity exists
            SystemRole role = systemRoleService.findOrCreateRole(systemRole);

            // Handle user creation/retrieval
            // - New users: Create with Google/FapAPI information
            // - Existing users: Keep original information, don't update
            User user = userService.findByEmail(email).orElse(null);
            
            if (user == null) {
                // Create new user with information from Google/FapAPI
                user = new User();
                user.setEmail(email);
                user.setFullName(fullName);
                user.setAvatarUrl(avatarUrl);
                user.setProvider("GOOGLE");
                user.setProviderId(payload.getSubject()); // Google user ID
                user.setIsActive(true);
                user.setStudentCode(studentCode);
                user.setSystemRole(role);

                // Save new user to database
                user = userService.save(user);
            } else {
                // Check if existing user is active
                if (!user.getIsActive()) {
                    return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
                }
                // For existing users, keep their original information (don't update)
                // Only ensure they have a system role if missing
                if (user.getSystemRole() == null) {
                    user.setSystemRole(role);
                    user = userService.save(user);
                }
            }

        // Build a Spring Security user for token generation
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getSystemRole().getRoleName()));
        org.springframework.security.core.userdetails.User securityUser = new org.springframework.security.core.userdetails.User(user.getEmail(), "N/A", authorities);

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("fullName", user.getFullName());
        extraClaims.put("avatarUrl", user.getAvatarUrl());
        extraClaims.put("systemRole", user.getSystemRole().getRoleName());

        String accessToken = jwtUtil.generateAccessToken(extraClaims, securityUser);
        String refreshToken = jwtUtil.generateRefreshToken(securityUser);

        // Store refresh token in Redis
        try {
            refreshTokenService.createRefreshToken(user, refreshToken);
            log.info("Refresh token stored for user: {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to store refresh token for user: {}", user.getEmail(), e);
            // Continue with login even if refresh token storage fails
        }

        AuthenticationResponse.UserInfo userInfo = AuthenticationResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .systemRole(user.getSystemRole().getRoleName())
                .build();

        AuthenticationResponse auth = AuthenticationResponse.builder()
                .accessToken(accessToken)
                .user(userInfo)
                .build();

            return ApiResponse.success(auth);
        } catch (Exception e) {
            log.error("Error during Google login: {}", e.getMessage(), e);
            return ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, null);
        }
    }

    /**
     * Refresh token
     */
    @PostMapping("/refreshToken")
    public ApiResponse<AuthenticationResponse> refreshToken(
            @RequestHeader(name = "Authorization") String authorization) {
        try {
            // Extract access token from Authorization header
            String accessToken = authorization.substring(7);
            String email = jwtUtil.extractUsername(accessToken);
            
            if (email == null || email.trim().isEmpty()) {
                log.warn("Invalid access token provided for refresh");
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            // Find user in database
            Optional<User> userOpt = userService.findByEmail(email);
            if (userOpt.isEmpty()) {
                log.warn("User not found for refresh: {}", email);
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            User user = userOpt.get();
            
            // Check if user is active
            if (!user.getIsActive()) {
                log.warn("Inactive user attempted refresh: {}", email);
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            // Check if user has a valid refresh token in Redis
            if (!refreshTokenService.hasValidRefreshToken(user.getId().toString())) {
                log.warn("No valid refresh token found for user: {}", email);
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            String systemRole = user.getSystemRole() != null ? user.getSystemRole().getRoleName() : "STUDENT";
            
            // Build Spring Security user for token generation
            List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + systemRole));
            org.springframework.security.core.userdetails.User securityUser = new org.springframework.security.core.userdetails.User(
                    email,
                    "N/A",
                    authorities
            );

            Map<String, Object> extraClaims = new HashMap<>();
            extraClaims.put("fullName", user.getFullName());
            extraClaims.put("avatarUrl", user.getAvatarUrl());
            extraClaims.put("systemRole", systemRole);

            String newAccessToken = jwtUtil.generateAccessToken(extraClaims, securityUser);
            String newRefreshToken = jwtUtil.generateRefreshToken(securityUser);
            
            // Revoke old refresh token and store new one
            refreshTokenService.revokeRefreshToken(user.getId().toString());
            
            try {
                refreshTokenService.createRefreshToken(user, newRefreshToken);
                log.info("New refresh token created for user: {}", email);
            } catch (Exception e) {
                log.error("Failed to store new refresh token for user: {}", email, e);
                // Continue with response even if refresh token storage fails
            }

            AuthenticationResponse.UserInfo userInfo = AuthenticationResponse.UserInfo.builder()
                    .id(user.getId())
                    .email(email)
                    .fullName(user.getFullName())
                    .avatarUrl(user.getAvatarUrl())
                    .systemRole(systemRole)
                    .build();

            AuthenticationResponse auth = AuthenticationResponse.builder()
                    .accessToken(newAccessToken)
                    .user(userInfo)
                    .build();

            return ApiResponse.success(auth);
        } catch (Exception e) {
            log.error("Error refreshing token server-side: {}", e.getMessage(), e);
            return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
        }
    }

    @PostMapping("/logout")
    public ApiResponse<String> logout(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, String> body) {
        
        try {
            // Revoke access token
            if (authorization != null && authorization.startsWith("Bearer ")) {
                String token = authorization.substring(7);
                try {
                    String jti = jwtUtil.extractJti(token);
                    long exp = jwtUtil.extractExpiration(token).getTime();
                    tokenBlacklistService.revoke(jti, exp);
                    log.info("Access token revoked successfully");
                } catch (Exception e) {
                    log.warn("Failed to revoke access token: {}", e.getMessage());
                }
            }
            
            // Revoke refresh token if provided
            if (body != null && body.containsKey("refreshToken")) {
                String refreshToken = body.get("refreshToken");
                try {
                    // Revoke refresh token from Redis
                    String email = jwtUtil.extractUsername(refreshToken);
                    if (email != null) {
                        Optional<User> userOpt = userService.findByEmail(email);
                        if (userOpt.isPresent()) {
                            refreshTokenService.revokeRefreshToken(userOpt.get().getId().toString());
                            log.info("Refresh token revoked successfully from Redis");
                        }
                    } else {
                        // Fallback to JWT blacklist if not found in Redis
                        String refreshJti = jwtUtil.extractJti(refreshToken);
                        long refreshExp = jwtUtil.extractExpiration(refreshToken).getTime();
                        tokenBlacklistService.revoke(refreshJti, refreshExp);
                        log.info("Refresh token revoked successfully via JWT blacklist");
                    }
                } catch (Exception e) {
                    log.warn("Failed to revoke refresh token: {}", e.getMessage());
                }
            }
            
            return ApiResponse.success("Logout successful");
        } catch (Exception e) {
            log.error("Error during logout: {}", e.getMessage(), e);
            return ApiResponse.success("Logout completed with warnings");
        }
    }

    private GoogleIdToken.Payload verifyIdToken(String idTokenString) throws Exception {
        if (idTokenString == null || idTokenString.trim().isEmpty()) {
            throw new IllegalArgumentException("ID token cannot be null or empty");
        }
        
        var transport = GoogleNetHttpTransport.newTrustedTransport();
        var jsonFactory = JacksonFactory.getDefaultInstance();
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(transport, jsonFactory)
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(idTokenString);
        } catch (GeneralSecurityException | java.io.IOException e) {
            log.error("Google ID token verification failed: {}", e.getMessage());
            throw new RuntimeException("Failed to verify Google ID token", e);
        }
        if (idToken == null) {
            log.error("Google ID token is null after verification");
            throw new RuntimeException("Invalid Google ID token");
        }
        
        GoogleIdToken.Payload payload = idToken.getPayload();
        if (payload == null) {
            throw new RuntimeException("Invalid Google ID token payload");
        }
        
        return payload;
    }

    /**
     * Check if user has refresh token
     */
    @GetMapping("/has-refresh-token")
    public ApiResponse<Map<String, Boolean>> hasRefreshToken(
            @RequestHeader(name = "Authorization") String authorization) {
        try {
            String token = authorization.substring(7);
            String email = jwtUtil.extractUsername(token);
            
            if (email == null || email.trim().isEmpty()) {
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            Optional<User> userOpt = userService.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            boolean hasToken = refreshTokenService.hasValidRefreshToken(userOpt.get().getId().toString());
            Map<String, Boolean> response = new HashMap<>();
            response.put("hasRefreshToken", hasToken);
            
            return ApiResponse.success(response);
        } catch (Exception e) {
            log.error("Error checking refresh token: {}", e.getMessage(), e);
            return ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, null);
        }
    }

    /**
     * Revoke refresh token for current user
     */
    @PostMapping("/revoke-refresh-token")
    public ApiResponse<String> revokeRefreshToken(
            @RequestHeader(name = "Authorization") String authorization) {
        try {
            String token = authorization.substring(7);
            String email = jwtUtil.extractUsername(token);
            
            if (email == null || email.trim().isEmpty()) {
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            Optional<User> userOpt = userService.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            refreshTokenService.revokeRefreshToken(userOpt.get().getId().toString());
            return ApiResponse.success("Refresh token revoked successfully");
        } catch (Exception e) {
            log.error("Error revoking refresh token: {}", e.getMessage(), e);
            return ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, null);
        }
    }

    /**
     * Get refresh token for current user (admin only)
     */
    @GetMapping("/refresh-token")
    public ApiResponse<Map<String, String>> getRefreshToken(
            @RequestHeader(name = "Authorization") String authorization) {
        try {
            String token = authorization.substring(7);
            String email = jwtUtil.extractUsername(token);
            
            if (email == null || email.trim().isEmpty()) {
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            Optional<User> userOpt = userService.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            Optional<String> refreshTokenOpt = refreshTokenService.getRefreshToken(userOpt.get().getId().toString());
            Map<String, String> response = new HashMap<>();
            
            if (refreshTokenOpt.isPresent()) {
                response.put("refreshToken", refreshTokenOpt.get());
                response.put("hasToken", "true");
            } else {
                response.put("hasToken", "false");
            }
            
            return ApiResponse.success(response);
        } catch (Exception e) {
            log.error("Error getting refresh token: {}", e.getMessage(), e);
            return ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, null);
        }
    }

}


