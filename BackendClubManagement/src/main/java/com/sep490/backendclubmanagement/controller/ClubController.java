package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.UpdateClubInfoRequest;
import com.sep490.backendclubmanagement.dto.response.ClubDetailData;
import com.sep490.backendclubmanagement.dto.response.ClubDto;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.service.ClubServiceInterface;
import com.sep490.backendclubmanagement.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clubs")
@RequiredArgsConstructor
public class ClubController {

    private final ClubServiceInterface clubService;

    /**
     * Get club detail by ID
     * @param id Club ID
     * @return Club detail data
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClubDetailData>> getClubDetail(@PathVariable Long id) throws AppException {
        ClubDetailData data = clubService.getClubDetail(id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * Get club detail by club code
     * @param clubCode Club code
     * @return Club detail data
     */
    @GetMapping("/code/{clubCode}")
    public ResponseEntity<ApiResponse<ClubDetailData>> getClubDetailByCode(@PathVariable String clubCode) throws AppException {
        ClubDetailData data = clubService.getClubDetailByCode(clubCode);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * Get all clubs (id and name only)
     * @return List of clubs with id and clubName
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ClubDto>>> getAllClubs() {
        List<ClubDto> clubs = clubService.getAllClubs();
        return ResponseEntity.ok(ApiResponse.success(clubs));
    }

    /**
     * Get club information for club members to view
     * Only accessible by active members of the club or ADMIN/STAFF
     * @param id Club ID
     * @return Club detail data
     */
    @GetMapping("/{id}/club-info")
    @PreAuthorize("@clubSecurity.isMemberOfClub(#id)")
    public ResponseEntity<ApiResponse<ClubDetailData>> getClubInfo(
            @PathVariable Long id) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        ClubDetailData data = clubService.getClubInfo(id, userId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * Only club officers can update club information
     * @param id Club ID
     * @param request Update request with club information
     * @return Updated club detail data
     */
    @PutMapping("/{id}/officer-update")
    @PreAuthorize("@clubSecurity.isClubOfficerInClub(#id)")
    public ResponseEntity<ApiResponse<ClubDetailData>> updateClubInfo(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClubInfoRequest request) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        ClubDetailData data = clubService.updateClubInfo(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}

