package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.MemberResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
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
}
