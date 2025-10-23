package com.sep490.backendclubmanagement.controller.Club;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.response.MemberResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
import com.sep490.backendclubmanagement.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clubs")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    // Consolidated endpoint for all member filtering needs
    @GetMapping("/{clubId}/members")
    public ApiResponse<PageResponse<MemberResponse>> getMembers(
            @PathVariable Long clubId,
            @RequestParam(defaultValue = "ACTIVE") String status, // "ACTIVE" or "LEFT"
            @RequestParam(required = false) Long semesterId, // Filter by semester
            @RequestParam(required = false) Long roleId, // Filter by club role
            @RequestParam(required = false) String searchTerm, // Search by name or student code
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        
        ClubMemberShipStatus memberStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                memberStatus = ClubMemberShipStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Invalid status, will be treated as null (no filter)
            }
        }
        
        PageResponse<MemberResponse> result = memberService.getMembersWithFilters(
                clubId, memberStatus, semesterId, roleId, searchTerm, pageable);
        
        return ApiResponse.success(result);
    }
}
