package com.sep490.backendclubmanagement.controller.Staff;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.ClubFilterRequest;
import com.sep490.backendclubmanagement.dto.request.CreateClubRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateClubRequest;
import com.sep490.backendclubmanagement.dto.response.ClubManagementResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.service.ClubServiceInterface;
import com.sep490.backendclubmanagement.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for Staff to manage clubs
 */
@RestController
@RequestMapping("/api/staff/clubs")
@RequiredArgsConstructor
public class ClubManagementStaffController {

    private final ClubServiceInterface clubService;

    /**
     * Get clubs with filter, search and pagination
     * GET /api/staff/clubs
     * @param request Filter request containing keyword, campusId, categoryId, status, pagination params
     * @return PageResponse of clubs
     */
    @PreAuthorize("@clubSecurity.isStaff()")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ClubManagementResponse>>> getClubs(
            ClubFilterRequest request
    ) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        PageResponse<ClubManagementResponse> response = clubService.getClubsByFilter(request, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Get club detail (for editing)
     * GET /api/staff/clubs/{clubId}
     * @param clubId Club ID
     * @return Club detail
     */
    @PreAuthorize("@clubSecurity.isStaff()")
    @GetMapping("/{clubId}")
    public ResponseEntity<ApiResponse<ClubManagementResponse>> getClubDetail(
            @PathVariable Long clubId
    ) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        ClubManagementResponse clubDetail = clubService.getClubForManagement(clubId, userId);
        return ResponseEntity.ok(ApiResponse.success(clubDetail));
    }

    /**
     * Create new club
     * POST /api/staff/clubs
     * @param request Create club request (including presidentEmail)
     * @return Created club
     */
    @PreAuthorize("@clubSecurity.isStaff()")
    @PostMapping
    public ResponseEntity<ApiResponse<ClubManagementResponse>> createClub(
            @Valid @RequestBody CreateClubRequest request
    ) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        ClubManagementResponse response = clubService.createClub(request, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Update club
     * PUT /api/staff/clubs/{clubId}
     * @param clubId Club ID
     * @param request Update club request
     * @return Updated club
     */
    @PreAuthorize("@clubSecurity.isStaff()")
    @PutMapping("/{clubId}")
    public ResponseEntity<ApiResponse<ClubManagementResponse>> updateClub(
            @PathVariable Long clubId,
            @Valid @RequestBody UpdateClubRequest request
    ) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        ClubManagementResponse response = clubService.updateClub(clubId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Change club status to UNACTIVE
     * PATCH /api/staff/clubs/{clubId}/deactivate
     * @param clubId Club ID
     * @return Success message
     */
    @PreAuthorize("@clubSecurity.isStaff()")
    @PatchMapping("/{clubId}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateClub(
            @PathVariable Long clubId
    ) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        clubService.deactivateClub(clubId, userId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * Change club status to ACTIVE
     * PATCH /api/staff/clubs/{clubId}/activate
     * @param clubId Club ID
     * @return Success message
     */
    @PreAuthorize("@clubSecurity.isStaff()")
    @PatchMapping("/{clubId}/activate")
    public ResponseEntity<ApiResponse<Void>> activateClub(
            @PathVariable Long clubId
    ) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        clubService.activateClub(clubId, userId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}

