package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.MemberResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
import com.sep490.backendclubmanagement.exception.AppException;
import org.springframework.data.domain.Pageable;

public interface MemberService {
    
    // Consolidated method for all filtering needs
    PageResponse<MemberResponse> getMembersWithFilters(
        Long clubId, 
        ClubMemberShipStatus status, 
        Long semesterId, 
        Long roleId,
        Boolean isActive,
        String searchTerm, 
        Pageable pageable
    );
    
    // Dedicated method for filtering left members
    PageResponse<MemberResponse> getLeftMembers(
        Long clubId,
        String searchTerm,
        Pageable pageable
    );

    void updateMemberRole(Long clubId, Long userId, Long roleId, Long semesterId, Long currentUserId) throws AppException;

    void updateMemberTeam(Long clubId, Long userId, Long teamId, Long semesterId) throws AppException;

    void updateMemberActiveStatus(Long clubId, Long userId, boolean isActive, Long semesterId);

    void removeMemberFromClub(Long clubId, Long userId, String reason);
}
