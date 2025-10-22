package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.*;
import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.RecruitmentApplicationStatus;
import com.sep490.backendclubmanagement.entity.RecruitmentStatus;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.service.RecruitmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/recruitments")
@RequiredArgsConstructor
public class RecruitmentController {

    private final RecruitmentService recruitmentService;

    @GetMapping("/clubs/{clubId}")
    public ResponseEntity<ApiResponse<Page<RecruitmentData>>> listRecruitments(
            @PathVariable Long clubId,
            @RequestParam(required = false) RecruitmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "startDate,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<RecruitmentData> data = recruitmentService.listRecruitments(clubId, status, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<RecruitmentData>>builder()
                .code(200).message("OK").timestamp(Instant.now()).data(data).build());
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
    public ResponseEntity<ApiResponse<Page<ApplicationData>>> listApplications(
            @PathVariable Long recruitmentId,
            @RequestParam(required = false) RecruitmentApplicationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "submittedDate,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<ApplicationData> data = recruitmentService.listApplications(recruitmentId, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/applications/submit")
    public ResponseEntity<ApiResponse<ApplicationData>> submit(
            @RequestHeader("X-User-Id") Long applicantId,
            @RequestBody ApplicationSubmitRequest request
    ) throws AppException {
        ApplicationData data = recruitmentService.submitApplication(applicantId, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/applications/{applicationId}")
    public ResponseEntity<ApiResponse<ApplicationData>> getApplication(@PathVariable Long applicationId) throws AppException {
        ApplicationData data = recruitmentService.getApplication(applicationId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/applications/review")
    public ResponseEntity<ApiResponse<ApplicationData>> review(@RequestBody ApplicationReviewRequest request) throws AppException {
        ApplicationData data = recruitmentService.reviewApplication(request);
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


