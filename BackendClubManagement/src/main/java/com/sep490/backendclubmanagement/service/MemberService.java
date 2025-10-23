package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.MemberResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
import org.springframework.data.domain.Pageable;

public interface MemberService {
    PageResponse<MemberResponse> getMembersByClub(Long clubId, Pageable pageable);
    
    // Consolidated method for all filtering needs
    PageResponse<MemberResponse> getMembersWithFilters(
        Long clubId, 
        ClubMemberShipStatus status, 
        Long semesterId, 
        Long roleId, 
        String searchTerm, 
        Pageable pageable
    );
}
