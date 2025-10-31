package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.service.ClubManagementService;
import com.sep490.backendclubmanagement.service.ClubTeamVisibilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.sep490.backendclubmanagement.dto.request.CreateFeeRequest;
import com.sep490.backendclubmanagement.service.FeeService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/management")
@RequiredArgsConstructor
public class ClubManagementController {

    private final ClubManagementService clubManagementService;
    private final ClubTeamVisibilityService clubTeamVisibilityService;
    private final FeeService feeService;

    private boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        Object principal = auth.getPrincipal();
        return !(principal instanceof String s && "anonymousUser".equalsIgnoreCase(s));
    }

    @GetMapping("/my-clubs")
    public ResponseEntity<ApiResponse<List<MyClubDTO>>> getMyClubs() {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    ApiResponse.error(ErrorCode.UNAUTHORIZED, "Unauthorized", null)
            );
        }
        List<MyClubDTO> myClubs = clubManagementService.getMyClubs();
        return ResponseEntity.ok(ApiResponse.success(myClubs));
    }

    @GetMapping("/clubs/{clubId}")
    public ResponseEntity<ApiResponse<ClubDetailDTO>> getClubManagementDetail(@PathVariable Long clubId) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    ApiResponse.error(ErrorCode.UNAUTHORIZED, "Unauthorized", null)
            );
        }
        ClubDetailDTO clubDetail = clubManagementService.getClubManagementDetail(clubId);
        return ResponseEntity.ok(ApiResponse.success(clubDetail));
    }

    @GetMapping("/clubs/{clubId}/teams")
    public ResponseEntity<ApiResponse<List<VisibleTeamDTO>>> getVisibleTeams(
            @PathVariable Long clubId,
            @RequestParam(required = false) Long semesterId
    ) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    ApiResponse.error(ErrorCode.UNAUTHORIZED, "Unauthorized", null)
            );
        }
        List<VisibleTeamDTO> data = clubTeamVisibilityService.getVisibleTeams(clubId, semesterId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/clubs/{clubId}/team/{teamId}")
    public ResponseEntity<ApiResponse<MyTeamDetailDTO>> getTeamDetail(
            @PathVariable Long clubId,
            @PathVariable Long teamId,
            @RequestParam(required = false) Long semesterId
    ) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    ApiResponse.error(ErrorCode.UNAUTHORIZED, "Unauthorized", null)
            );
        }
        MyTeamDetailDTO data = clubTeamVisibilityService.getTeamDetail(clubId, teamId, semesterId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
