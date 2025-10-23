package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.*;
import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.RecruitmentApplicationStatus;
import com.sep490.backendclubmanagement.entity.RecruitmentStatus;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.service.RecruitmentService;
import com.sep490.backendclubmanagement.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recruitments")
@RequiredArgsConstructor
public class RecruitmentController {

    private final RecruitmentService recruitmentService;
    private final UserService userService;

    @GetMapping("/clubs/{clubId}")
    public ResponseEntity<ApiResponse<PagedResponse<RecruitmentData>>> listRecruitments(
            @PathVariable Long clubId,
            @RequestParam(required = false) RecruitmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "startDate,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        PagedResponse<RecruitmentData> data = recruitmentService.listRecruitments(clubId, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RecruitmentData>> getRecruitment(@PathVariable Long id) throws AppException {
        RecruitmentData data = recruitmentService.getRecruitment(id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/clubs/{clubId}")
    public ResponseEntity<ApiResponse<RecruitmentData>> createRecruitment(
            @PathVariable Long clubId,
            @RequestBody RecruitmentCreateRequest request
    ) {
        RecruitmentData data = recruitmentService.createRecruitment(clubId, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RecruitmentData>> updateRecruitment(
            @PathVariable Long id,
            @RequestBody RecruitmentUpdateRequest request
    ) throws AppException {
        RecruitmentData data = recruitmentService.updateRecruitment(id, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> changeStatus(
            @PathVariable Long id,
            @RequestParam RecruitmentStatus status
    ) throws AppException {
        recruitmentService.changeRecruitmentStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRecruitment(@PathVariable Long id) {
        recruitmentService.deleteRecruitment(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Applications
    @GetMapping("/{recruitmentId}/applications")
    public ResponseEntity<ApiResponse<PagedResponse<RecruitmentApplicationData>>> listApplications(
            @PathVariable Long recruitmentId,
            @RequestParam(required = false) RecruitmentApplicationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "submittedDate,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        PagedResponse<RecruitmentApplicationData> data = recruitmentService.listApplications(recruitmentId, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/applications/submit")
    public ResponseEntity<ApiResponse<RecruitmentApplicationData>> submit(
            Authentication authentication,
            @RequestBody ApplicationSubmitRequest request
    ) throws AppException {
        // Get current user from authentication
//        String email = authentication.getName();
//        User currentUser = userService.findByEmail(email)
//                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        RecruitmentApplicationData data = recruitmentService.submitApplication(Long.parseLong("6"), request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/applications/{applicationId}")
    public ResponseEntity<ApiResponse<RecruitmentApplicationData>> getApplication(@PathVariable Long applicationId) throws AppException {
        RecruitmentApplicationData data = recruitmentService.getApplication(applicationId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/applications/review")
    public ResponseEntity<ApiResponse<RecruitmentApplicationData>> review(@RequestBody ApplicationReviewRequest request) throws AppException {
        RecruitmentApplicationData data = recruitmentService.reviewApplication(request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/applications/{applicationId}/withdraw")
    public ResponseEntity<ApiResponse<Void>> withdraw(@PathVariable Long applicationId) {
        recruitmentService.withdrawApplication(applicationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String prop = parts.length > 0 ? parts[0] : "createdAt";
        Sort.Direction dir = (parts.length > 1 && parts[1].equalsIgnoreCase("asc"))
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, prop);
    }
}


