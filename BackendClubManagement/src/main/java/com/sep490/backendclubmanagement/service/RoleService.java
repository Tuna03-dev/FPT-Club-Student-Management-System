package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.repository.RoleMemberShipRepository;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleService {
    
    private final RoleMemberShipRepository roleMemberShipRepository;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;

    /**
     * Lấy system role của user
     */
    public String getUserSystemRole(Long userId) {
        return roleMemberShipRepository.findSystemRoleByUserId(userId)
                .orElse("STUDENT"); // Default role nếu không tìm thấy
    }

    public String getUserSystemRoleStaff(Long userId) {
        return roleMemberShipRepository.findSystemRoleStaff(userId)
                .orElse("STUDENT"); // Default role nếu không tìm thấy
    }

    /**
     * Kiểm tra user có role cụ thể trong club không (dựa vào system role)
     */
    public boolean hasRoleInClub(Long userId, Long clubId, String roleCode) {
        String systemRole = getUserSystemRole(userId);
        return roleCode.equals(systemRole);
    }

    
    /**
     * Kiểm tra user có phải CLUB_PRESIDENT không (dựa vào system role)
     */
    public boolean isClubPresident(Long userId, Long clubId) {
        String systemRole = getUserSystemRole(userId);
        return "CLUB_PRESIDENT".equals(systemRole);
    }

        /**
         * Kiểm tra user có phải CLUB_PRESIDENT không (không phụ thuộc club)
         */
        public boolean isClubPresident(Long userId) {
            String systemRole = getUserSystemRole(userId);
            return "CLUB_PRESIDENT".equals(systemRole);
        }
    
    /**
     * Kiểm tra user có phải CLUB_OFFICER không (dựa vào system role)
     */
    public boolean isClubOfficer(Long userId) {
        String systemRole = getUserSystemRole(userId);
        return "CLUB_OFFICER".equals(systemRole);
    }
    public boolean isClubOfficer(Long userId, Long clubId) {
        String systemRole = getUserSystemRole(userId);
        return "CLUB_OFFICER".equals(systemRole);
    }
    
    /**
     * Kiểm tra user có phải STAFF không (dựa vào system role)
     */
    public boolean isStaff(Long userId) {
        String systemRole = getUserSystemRoleStaff(userId);
        return "STAFF".equals(systemRole);
    }
    
    /**
     * Kiểm tra user có quyền tạo event không
     */
    public boolean canCreateEvent(Long userId, Long clubId) {
        // Staff không có club membership, cần check từ users.system_role_id
        if (isStaff(userId)) {
            return true;
        }
        // Các role khác check từ club membership
        String systemRole = getUserSystemRole(userId);
        return "CLUB_PRESIDENT".equals(systemRole) || 
               "CLUB_OFFICER".equals(systemRole);
    }
    
    /**
     * Lấy danh sách club mà user là president
     * TODO: Implement logic này dựa vào SystemRole
     */
    public List<Club> getClubsWhereUserIsPresident(Long userId) {
        List<Long> clubIds = roleMemberShipRepository.findPresidentClubIdsByUserId(userId);
        if (clubIds == null || clubIds.isEmpty()) {
            return List.of();
        }
        return clubRepository.findAllById(clubIds);
    }
}

