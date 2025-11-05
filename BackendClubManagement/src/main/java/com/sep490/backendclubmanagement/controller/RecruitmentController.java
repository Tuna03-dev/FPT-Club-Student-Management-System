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
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "startDate,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        PagedResponse<RecruitmentData> data = recruitmentService.listRecruitments(clubId, status, keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RecruitmentData>> getRecruitment(@PathVariable Long id) throws AppException {
        RecruitmentData data = recruitmentService.getRecruitment(id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/clubs/{clubId}")
    public ResponseEntity<ApiResponse<RecruitmentData>> createRecruitment(
            Authentication authentication,
            @PathVariable Long clubId,
            @RequestBody RecruitmentCreateRequest request
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        RecruitmentData data = recruitmentService.createRecruitment(currentUser.getId(), clubId, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RecruitmentData>> updateRecruitment(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody RecruitmentUpdateRequest request
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        RecruitmentData data = recruitmentService.updateRecruitment(currentUser.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> changeStatus(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam RecruitmentStatus status
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        recruitmentService.changeRecruitmentStatus(currentUser.getId(), id, status);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRecruitment(
            Authentication authentication,
            @PathVariable Long id
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        recruitmentService.deleteRecruitment(currentUser.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    
    // Submit application
    @PostMapping(path = "/applications/submit", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<RecruitmentApplicationData>> submit(
            Authentication authentication,
            @RequestPart("request") ApplicationSubmitRequest request,
            @RequestParam MultiValueMap<String, MultipartFile> allFiles
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        RecruitmentApplicationData data = recruitmentService.submitApplication(currentUser.getId(), request, allFiles);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Review application
    @PostMapping("/applications/review")
    public ResponseEntity<ApiResponse<RecruitmentApplicationData>> review(
            Authentication authentication,
            @RequestBody ApplicationReviewRequest request
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        RecruitmentApplicationData data = recruitmentService.reviewApplication(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // List applications for a recruitment
    @GetMapping("/{recruitmentId}/applications")
    public ResponseEntity<ApiResponse<PagedResponse<RecruitmentApplicationData>>> listApplications(
            Authentication authentication,
            @PathVariable Long recruitmentId,
            @RequestParam(required = false) RecruitmentApplicationStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "submittedDate,desc") String sort
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        PagedResponse<RecruitmentApplicationData> data = recruitmentService.listApplications(currentUser.getId(), recruitmentId, status, keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Get application by ID
    @GetMapping("/applications/{applicationId}")
    public ResponseEntity<ApiResponse<RecruitmentApplicationData>> getApplication(
            Authentication authentication,
            @PathVariable Long applicationId
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        RecruitmentApplicationData data = recruitmentService.getApplication(currentUser.getId(), applicationId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Get applications for current user
    @GetMapping("/myApplications")
    public ResponseEntity<ApiResponse<PagedResponse<RecruitmentApplicationData>>> getMyApplications(
            Authentication authentication,
            @RequestParam(required = false) RecruitmentApplicationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "submittedDate,desc") String sort
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        PagedResponse<RecruitmentApplicationData> data = recruitmentService.listMyApplications(currentUser.getId(), status, pageable);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Get a specific application that the current user submitted
    @GetMapping("/myApplications/{applicationId}")
    public ResponseEntity<ApiResponse<RecruitmentApplicationData>> getMyApplication(
            Authentication authentication,
            @PathVariable Long applicationId
    ) throws AppException {
        // Get current user from authentication
        String email = authentication.getName();
        User currentUser = userService.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        
        RecruitmentApplicationData data = recruitmentService.getMyApplication(currentUser.getId(), applicationId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String prop = parts.length > 0 ? parts[0] : "createdAt";
        Sort.Direction dir = (parts.length > 1 && parts[1].equalsIgnoreCase("asc"))
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, prop);
    }
}


