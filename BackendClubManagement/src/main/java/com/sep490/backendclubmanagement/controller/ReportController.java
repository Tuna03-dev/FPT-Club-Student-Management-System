package com.sep490.backendclubmanagement.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.CreateReportRequirementRequest;
import com.sep490.backendclubmanagement.dto.request.CreateReportRequest;
import com.sep490.backendclubmanagement.dto.request.ReportFilterRequest;
import com.sep490.backendclubmanagement.dto.request.ReportRequirementFilterRequest;
import com.sep490.backendclubmanagement.dto.request.ReportReviewRequest;
import com.sep490.backendclubmanagement.dto.request.SubmitReportRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateReportRequest;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.dto.response.ReportDetailResponse;
import com.sep490.backendclubmanagement.dto.response.ReportListItemResponse;
import com.sep490.backendclubmanagement.dto.response.ReportRequirementResponse;
import com.sep490.backendclubmanagement.service.ReportServiceInterface;
import com.sep490.backendclubmanagement.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportServiceInterface reportService;
    private final ObjectMapper objectMapper;

    /**
     * Get all reports with filters and pagination (for staff only)
     */
    @PostMapping("/staff/filter")
    public ApiResponse<PageResponse<ReportListItemResponse>> getAllReports(
            @RequestBody @Valid ReportFilterRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        PageResponse<ReportListItemResponse> data = reportService.getAllReports(request, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get report detail by ID (for staff only)
     */
    @GetMapping("/staff/{id}")
    public ApiResponse<ReportDetailResponse> getReportDetail(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.getReportDetail(id, userId);
        return ApiResponse.success(data);
    }

    /**
     * Review (approve/reject) a report (for staff only)
     */
    @PostMapping("/staff/review")
    public ApiResponse<Void> reviewReport(@RequestBody @Valid ReportReviewRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        reportService.reviewReport(request, userId);
        return ApiResponse.success();
    }

    /**
     * Get all report requirements with filters and pagination (for staff only)
     */
    @PostMapping("/staff/requirements/filter")
    public ApiResponse<PageResponse<ReportRequirementResponse>> getAllReportRequirements(
            @RequestBody @Valid ReportRequirementFilterRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        PageResponse<ReportRequirementResponse> data = reportService.getAllReportRequirements(request, userId);
        return ApiResponse.success(data);
    }

    /**
     * Create report requirement for multiple clubs (for staff only)
     * JSON endpoint (without file upload)
     */
    @PostMapping(value = "/staff/requirements", consumes = "application/json")
    public ApiResponse<ReportRequirementResponse> createReportRequirement(
            @RequestBody @Valid CreateReportRequirementRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportRequirementResponse data = reportService.createReportRequirement(request, null, userId);
        return ApiResponse.success(data);
    }

    /**
     * Create report requirement for multiple clubs with file upload (for staff only)
     * Multipart/form-data endpoint
     */
    @PostMapping(value = "/staff/requirements", consumes = "multipart/form-data")
    public ApiResponse<ReportRequirementResponse> createReportRequirementWithFile(
            @RequestPart("request") String requestJson,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) throws Exception {
        Long userId = SecurityUtils.getCurrentUserId();
        CreateReportRequirementRequest request = objectMapper.readValue(requestJson, CreateReportRequirementRequest.class);
        ReportRequirementResponse data = reportService.createReportRequirement(request, file, userId);
        return ApiResponse.success(data);
    }

    /**
     * Create a report (draft for team officer, can submit for club president)
     */
    @PostMapping("/club")
    public ApiResponse<ReportDetailResponse> createReport(
            @RequestBody @Valid CreateReportRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.createReport(request, userId);
        return ApiResponse.success(data);
    }

    /**
     * Update a draft report
     */
    @PutMapping("/club/{reportId}")
    public ApiResponse<ReportDetailResponse> updateReport(
            @PathVariable Long reportId,
            @RequestBody @Valid UpdateReportRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.updateReport(reportId, request, userId);
        return ApiResponse.success(data);
    }

    /**
     * Submit a draft report (club president only)
     */
    @PostMapping("/club/submit")
    public ApiResponse<ReportDetailResponse> submitReport(
            @RequestBody @Valid SubmitReportRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.submitReport(request, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get all reports for a club (club president can see all, team officer can see their own)
     */
    @GetMapping("/club/{clubId}")
    public ApiResponse<List<ReportListItemResponse>> getClubReports(
            @PathVariable Long clubId
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        List<ReportListItemResponse> data = reportService.getClubReports(clubId, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get my draft reports for a club
     */
    @GetMapping("/club/{clubId}/drafts")
    public ApiResponse<List<ReportListItemResponse>> getMyDraftReports(
            @PathVariable Long clubId
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        List<ReportListItemResponse> data = reportService.getMyDraftReports(clubId, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get all report requirements for a club (for club members)
     */
    @GetMapping("/club/{clubId}/requirements")
    public ApiResponse<List<ReportRequirementResponse>> getClubReportRequirements(
            @PathVariable Long clubId
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        List<ReportRequirementResponse> data = reportService.getClubReportRequirements(clubId, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get list of clubs that need to submit reports for a specific report requirement (for staff only)
     */
    @GetMapping("/staff/requirements/{requirementId}/clubs")
    public ApiResponse<List<ReportRequirementResponse.ClubRequirementInfo>> getClubsByReportRequirement(
            @PathVariable Long requirementId
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        List<ReportRequirementResponse.ClubRequirementInfo> data = reportService.getClubsByReportRequirement(requirementId, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get report of a specific club for a specific report requirement (for staff only)
     * Returns null if club hasn't submitted report yet
     */
    @GetMapping("/staff/requirements/{requirementId}/clubs/{clubId}/report")
    public ApiResponse<ReportDetailResponse> getClubReportByRequirement(
            @PathVariable Long requirementId,
            @PathVariable Long clubId
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.getClubReportByRequirement(requirementId, clubId, userId);
        return ApiResponse.success(data);
    }
}

