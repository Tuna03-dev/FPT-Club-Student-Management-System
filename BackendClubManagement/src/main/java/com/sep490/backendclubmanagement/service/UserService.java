package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.entity.SystemRole;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.repository.SystemRoleRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final SystemRoleRepository systemRoleRepository;

    /**
     * Find user by email
     */
    public Optional<User> findByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return Optional.empty();
        }
        return userRepository.findByEmail(email.trim());
    }

    /**
     * Find user by ID
     */
    public Optional<User> findById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return userRepository.findById(id);
    }

    /**
     * Save user
     */
    @Transactional
    public User save(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }
        return userRepository.save(user);
    }


    /**
     * Update user information
     */
    @Transactional
    public User updateUser(User user) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User and user ID cannot be null");
        }

        Optional<User> existingUser = findById(user.getId());
        if (existingUser.isEmpty()) {
            throw new IllegalArgumentException("User with ID " + user.getId() + " not found");
        }

        return save(user);
    }

    /**
     * Activate/deactivate user
     */
    @Transactional
    public User setUserActiveStatus(Long userId, boolean isActive) {
        Optional<User> userOpt = findById(userId);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User with ID " + userId + " not found");
        }

        User user = userOpt.get();
        user.setIsActive(isActive);
        return save(user);
    }

    /**
     * Update system roles for users
     */
    @Transactional
    public User updateUserSystemRole(Long userId, String systemRoleName) {
        Optional<User> userOpt = findById(userId);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User with ID " + userId + " not found");
        }

        SystemRole systemRole = findOrCreateSystemRole(systemRoleName);
        User user = userOpt.get();
        user.setSystemRole(systemRole);
        return save(user);
    }

    /**
     * Get all users
     */
    public List<User> findAll() {
        return userRepository.findAll();
    }

    /**
     * Get all active users
     */
    public List<User> findAllActive() {
        return userRepository.findAll().stream()
                .filter(User::getIsActive)
                .toList();
    }

    /**
     * Find or create a system role
     */
    private SystemRole findOrCreateSystemRole(String roleName) {
        final String finalRoleName = (roleName == null || roleName.trim().isEmpty()) ? "STUDENT" : roleName.trim();

        return systemRoleRepository.findByRoleName(roleName.trim())
                .orElseGet(() -> {
                    SystemRole newRole = SystemRole.builder()
                            .roleName(finalRoleName.trim())
                            .description("System role for " + finalRoleName.toLowerCase())
                            .build();
                    return systemRoleRepository.save(newRole);
                });
    }

    /**
     * Check if user exists and is active
     */
    public boolean isUserActive(String email) {
        Optional<User> userOpt = findByEmail(email);
        return userOpt.isPresent() && userOpt.get().getIsActive();
    }

    /**
     * Get user system role
     */
    public Optional<String> getUserSystemRole(String email) {
        Optional<User> userOpt = findByEmail(email);
        if (userOpt.isPresent() && userOpt.get().getSystemRole() != null) {
            return Optional.of(userOpt.get().getSystemRole().getRoleName());
        }
        return Optional.empty();
    }
}

