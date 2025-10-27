package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.repository.RoleMemberShipRepository;
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

    /**
     * Lấy system role của user
     */
    public String getUserSystemRole(Long userId) {
        return roleMemberShipRepository.findSystemRoleByUserId(userId)
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
     * Kiểm tra user có phải CLUB_OFFICER không (dựa vào system role)
     */
    public boolean isClubOfficer(Long userId, Long clubId) {
        String systemRole = getUserSystemRole(userId);
        return "CLUB_OFFICER".equals(systemRole);
    }
    
    /**
     * Kiểm tra user có phải STAFF không (dựa vào system role)
     */
    public boolean isStaff(Long userId) {
        String systemRole = getUserSystemRole(userId);
        return "STAFF".equals(systemRole);
    }
    
    /**
     * Kiểm tra user có quyền tạo event không
     */
    public boolean canCreateEvent(Long userId, Long clubId) {
        String systemRole = getUserSystemRole(userId);
        return "STAFF".equals(systemRole) || 
               "CLUB_PRESIDENT".equals(systemRole) || 
               "CLUB_OFFICER".equals(systemRole);
    }
    
    /**
     * Lấy danh sách club mà user là president
     * TODO: Implement logic này dựa vào SystemRole
     */
    public List<Club> getClubsWhereUserIsPresident(Long userId) {
        // Với system role, CLUB_PRESIDENT có thể tạo event cho bất kỳ club nào
        // hoặc cần implement logic khác tùy business requirement
        log.warn("getClubsWhereUserIsPresident not fully implemented. Returning empty list.");
        return List.of();
    }
}

