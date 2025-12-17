package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.AuthenticationResponse;
import com.sep490.backendclubmanagement.dto.response.ClubRoleInfo;
import com.sep490.backendclubmanagement.exception.AppException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;

public interface AuthService {

    /**
     * Login with Google ID token
     */
    AuthenticationResponse loginWithGoogle(String idToken, HttpServletRequest request, HttpServletResponse response) throws AppException;

    /**
     * Refresh access token using refresh token from cookie
     */
    AuthenticationResponse refreshToken(HttpServletRequest request, HttpServletResponse response) throws AppException;

    /**
     * Logout user by revoking tokens
     */
    void logout(String accessToken, HttpServletRequest request, HttpServletResponse response) throws AppException;

    /**
     * Validate access token
     */
    boolean validateToken(String token) throws AppException;

    /**
     * Get club roles for current authenticated user
     */
    List<ClubRoleInfo> getMyRoles(String email) throws AppException;
}
