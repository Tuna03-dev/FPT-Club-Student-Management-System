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
import com.sep490.backendclubmanagement.service.ClubManagementService;
import com.sep490.backendclubmanagement.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Cookie;
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
    private final ClubManagementService clubManagementService;

    @Value("${google.client-id}")
    private String googleClientId;

    @PostMapping("/google")
    public ApiResponse<AuthenticationResponse> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        try {
            GoogleIdToken.Payload payload = verifyIdToken(request.getIdToken());
            String email = payload.getEmail();

            Optional<Map<String, Object>> profileOpt = fapApiServiceService.findProfileByEmail(email);
            if (profileOpt.isEmpty()) {
                return ApiResponse.error(ErrorCode.ORG_UNAUTHORIZED, null);
            }

            Map<String, Object> profile = profileOpt.get();
            String fullName = Objects.toString(profile.getOrDefault("fullName", payload.get("name")), "");
            String avatarUrl = Objects.toString(profile.getOrDefault("avatarUrl", payload.get("picture")), "");
            String studentCode = Optional.ofNullable((String) profile.get("studentCode"))
                    .filter(s -> !s.isBlank())
                    .orElse(null);


            SystemRole role = systemRoleService.findByRoleName("STUDENT").orElseGet(SystemRole::new);

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
                    return ApiResponse.error(ErrorCode.USER_NOT_ACTIVE, null);
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

        // Set authentication in SecurityContext for current request
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
            securityUser, null, authorities
        );
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(httpRequest));
        SecurityContextHolder.getContext().setAuthentication(authToken);

        // Lấy club roles của user
        List<com.sep490.backendclubmanagement.dto.response.ClubRoleInfo> clubRoleList =
                clubManagementService.getUserClubRoles(user.getId());

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("fullName", user.getFullName());
        extraClaims.put("avatarUrl", user.getAvatarUrl());
        extraClaims.put("clubRoles", clubRoleList);

        String accessToken = jwtUtil.generateAccessToken(extraClaims, securityUser);
        String refreshToken = jwtUtil.generateRefreshToken(securityUser);

        // Store refresh token in Redis with actual token expiration time
        try {
            long refreshTokenExpiration = jwtUtil.extractExpirationTimeMillis(refreshToken);
            refreshTokenService.createRefreshToken(user, refreshToken, refreshTokenExpiration);
            log.info("Refresh token stored for user: {} with expiration: {}", user.getEmail(), refreshTokenExpiration);
        } catch (Exception e) {
            log.error("Failed to store refresh token for user: {}", user.getEmail(), e);
        }

        // Set refresh token as HttpOnly cookie
        try {
            Cookie refreshTokenCookie = new Cookie("refreshToken", refreshToken);
            refreshTokenCookie.setHttpOnly(true);
            refreshTokenCookie.setSecure(false); // Set to false for development, true for production
            refreshTokenCookie.setPath("/");
            refreshTokenCookie.setMaxAge((int) ((jwtUtil.extractExpirationTimeMillis(refreshToken) - System.currentTimeMillis()) / 1000));
            httpResponse.addCookie(refreshTokenCookie);
            log.info("Refresh token cookie set for user: {}", user.getEmail());
        } catch (Exception e) {
                log.error("Failed to set refresh token cookie for user: {}", user.getEmail(), e);
            }

            AuthenticationResponse.UserInfo userInfo = AuthenticationResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .systemRole(user.getSystemRole().getRoleName())
                .clubRoleList(clubRoleList)
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
            HttpServletRequest request, HttpServletResponse response) {
        try {
            // Extract refresh token from HttpOnly cookie
            String refreshToken = null;
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if ("refreshToken".equals(cookie.getName())) {
                        refreshToken = cookie.getValue();
                        break;
                    }
                }
            }
            
            if (refreshToken == null || refreshToken.trim().isEmpty()) {
                log.warn("No refresh token found in cookies");
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            // Extract email from refresh token
            String email = jwtUtil.extractUsername(refreshToken);
            if (email == null || email.trim().isEmpty()) {
                log.warn("Invalid refresh token provided");
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
            
            // Validate refresh token against stored token in Redis
            if (!refreshTokenService.isValidRefreshToken(user.getId().toString(), refreshToken)) {
                log.warn("Invalid refresh token for user: {}", email);
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

            // Set authentication in SecurityContext for current request
            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                securityUser, null, authorities
            );
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);

            // Lấy club roles của user
            List<com.sep490.backendclubmanagement.dto.response.ClubRoleInfo> clubRoleList =
                    clubManagementService.getUserClubRoles(user.getId());

            Map<String, Object> extraClaims = new HashMap<>();
            extraClaims.put("fullName", user.getFullName());
            extraClaims.put("avatarUrl", user.getAvatarUrl());
            extraClaims.put("systemRole", systemRole);
            extraClaims.put("clubRoles", clubRoleList);

            String newAccessToken = jwtUtil.generateAccessToken(extraClaims, securityUser);
            String newRefreshToken = jwtUtil.generateRefreshToken(securityUser);
            
            // Revoke old refresh token and store new one
            refreshTokenService.revokeRefreshToken(user.getId().toString());
            
            try {
                long refreshTokenExpiration = jwtUtil.extractExpirationTimeMillis(newRefreshToken);
                refreshTokenService.createRefreshToken(user, newRefreshToken, refreshTokenExpiration);
                log.info("New refresh token created for user: {} with expiration: {}", email, refreshTokenExpiration);
            } catch (Exception e) {
                log.error("Failed to store new refresh token for user: {}", email, e);
                // Continue with response even if refresh token storage fails
            }

            // Set new refresh token as HttpOnly cookie
            try {
                Cookie refreshTokenCookie = new Cookie("refreshToken", newRefreshToken);
                refreshTokenCookie.setHttpOnly(true);
                refreshTokenCookie.setSecure(false); // Set to false for development, true for production
                refreshTokenCookie.setPath("/");
                refreshTokenCookie.setMaxAge((int) ((jwtUtil.extractExpirationTimeMillis(newRefreshToken) - System.currentTimeMillis()) / 1000));
                response.addCookie(refreshTokenCookie);
                log.info("New refresh token cookie set for user: {}", email);
            } catch (Exception e) {
                log.error("Failed to set new refresh token cookie for user: {}", email, e);
            }


            AuthenticationResponse.UserInfo userInfo = AuthenticationResponse.UserInfo.builder()
                    .id(user.getId())
                    .email(email)
                    .fullName(user.getFullName())
                    .avatarUrl(user.getAvatarUrl())
                    .systemRole(systemRole)
                    .clubRoleList(clubRoleList)
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
            HttpServletRequest request, HttpServletResponse response) {
        
        try {
            if (authorization == null || !authorization.startsWith("Bearer ")) {
                log.warn("No valid authorization header provided for logout");
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            String accessToken = authorization.substring(7);
            String email = jwtUtil.extractUsername(accessToken);
            
            if (email == null || email.trim().isEmpty()) {
                log.warn("Invalid access token provided for logout");
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            // Find user to get user ID for refresh token revocation
            Optional<User> userOpt = userService.findByEmail(email);
            if (userOpt.isEmpty()) {
                log.warn("User not found for logout: {}", email);
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }
            
            User user = userOpt.get();
            String userId = user.getId().toString();
            
            // Revoke access token by adding to blacklist
            try {
                String jti = jwtUtil.extractJti(accessToken);
                long exp = jwtUtil.extractExpirationTimeMillis(accessToken);
                tokenBlacklistService.revoke(jti, exp);
                log.info("Access token revoked successfully for user: {} with TTL: {}s", email, (exp - System.currentTimeMillis()) / 1000);
            } catch (Exception e) {
                log.warn("Failed to revoke access token for user: {}", email, e);
            }
            
            // Revoke refresh token from Redis
            try {
                refreshTokenService.revokeRefreshToken(userId);
                log.info("Refresh token revoked successfully from Redis for user: {}", email);
            } catch (Exception e) {
                log.warn("Failed to revoke refresh token from Redis for user: {}", email, e);
            }

            // Clear refresh token cookie
            try {
                Cookie refreshTokenCookie = new Cookie("refreshToken", "");
                refreshTokenCookie.setHttpOnly(true);
                refreshTokenCookie.setSecure(true);
                refreshTokenCookie.setPath("/");
                refreshTokenCookie.setMaxAge(0); // Expire immediately
                response.addCookie(refreshTokenCookie);
                log.info("Refresh token cookie cleared for user: {}", email);
            } catch (Exception e) {
                log.warn("Failed to clear refresh token cookie for user: {}", email, e);
            }
            
            return ApiResponse.success("Logout successful");
        } catch (Exception e) {
            log.error("Error during logout: {}", e.getMessage(), e);
            return ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, null);
        }
    }

    /**
     * API endpoint để refresh club roles của user hiện tại
     * Dùng khi cần cập nhật role data trong localStorage
     */
    @GetMapping("/my-roles")
    public ApiResponse<List<com.sep490.backendclubmanagement.dto.response.ClubRoleInfo>> getMyRoles() {
        try {
            // Lấy user hiện tại từ SecurityContext
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }

            String email = auth.getName();
            Optional<User> userOpt = userService.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ApiResponse.error(ErrorCode.UNAUTHORIZED, null);
            }

            User user = userOpt.get();
            List<com.sep490.backendclubmanagement.dto.response.ClubRoleInfo> clubRoleList = 
                    clubManagementService.getUserClubRoles(user.getId());

            return ApiResponse.success(clubRoleList);
        } catch (Exception e) {
            log.error("Error getting user roles: {}", e.getMessage(), e);
            return ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, null);
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
}


