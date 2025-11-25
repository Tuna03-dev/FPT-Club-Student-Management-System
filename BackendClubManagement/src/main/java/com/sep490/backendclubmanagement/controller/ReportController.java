package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.AssignTeamToReportRequirementRequest;
import com.sep490.backendclubmanagement.dto.request.ClubReportRequirementFilterRequest;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportServiceInterface reportService;

    /**
     * Get all reports with filters and pagination (for staff only)
     */
    @PreAuthorize("@clubSecurity.isStaff()")
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
    @PreAuthorize("@clubSecurity.isStaff()")
    @GetMapping("/staff/{id}")
    public ApiResponse<ReportDetailResponse> getReportDetail(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.getReportDetail(id, userId);
        return ApiResponse.success(data);
    }

    /**
     * Review (approve/reject) a report (for staff only)
     */
    @PreAuthorize("@clubSecurity.isStaff()")
    @PostMapping("/staff/review")
    public ApiResponse<Void> reviewReport(@RequestBody @Valid ReportReviewRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        reportService.reviewReport(request, userId);
        return ApiResponse.success();
    }

    /**
     * Get all report requirements with filters and pagination (for staff only)
     */
    @PreAuthorize("@clubSecurity.isStaff()")
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
     * Multipart/form-data endpoint
     * File upload is optional. If file is provided, it will be uploaded to Cloudinary.
     */
    @PreAuthorize("@clubSecurity.isStaff()")
    @PostMapping(value = "/staff/requirements", consumes = "multipart/form-data")
    public ApiResponse<ReportRequirementResponse> createReportRequirement(
            @RequestPart("request") @Valid CreateReportRequirementRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportRequirementResponse data = reportService.createReportRequirement(request, file, userId);
        return ApiResponse.success(data);
    }

    /**
     * Create a report (draft for team officer, can submit for club president)
     * Multipart/form-data endpoint
     * File upload is optional. If file is provided, it will be uploaded to Cloudinary.
     * If autoSubmit is true (or null/default) and user is club president, the report will be automatically submitted.
     * If autoSubmit is false and user is club president, the report will be created as draft.
     * Team officer can only create draft reports regardless of autoSubmit flag.
     */
    @PreAuthorize("clubSecurity.isTeamOfficerOrClubOfficerInClub(#request.clubId)")
    @PostMapping(value = "/club", consumes = "multipart/form-data")
    public ApiResponse<ReportDetailResponse> createReport(
            @RequestPart("request") @Valid CreateReportRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.createReportWithFile(request, file, userId);
        return ApiResponse.success(data);
    }

    /**
     * Update a draft report
     * Multipart/form-data endpoint
     * File upload is optional. If file is provided, it will be uploaded to Cloudinary.
     */
    @PreAuthorize("@clubSecurity.isTeamOfficerOrClubOfficerForReport(#reportId)")
    @PutMapping(value = "/club/{reportId}", consumes = "multipart/form-data")
    public ApiResponse<ReportDetailResponse> updateReport(
            @PathVariable Long reportId,
            @RequestPart("request") @Valid UpdateReportRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.updateReportWithFile(reportId, request, file, userId);
        return ApiResponse.success(data);
    }

    /**
     * Submit a draft report (club president or team officer who is the creator)
     */
    @PreAuthorize("@clubSecurity.isTeamOfficerOrClubOfficerForReport(#request.reportId)")
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
    @PreAuthorize("@clubSecurity.isMemberOfClub(#request.clubId)")
    @PostMapping("/club/{clubId}")
    public ApiResponse<PageResponse<ReportListItemResponse>> getClubReports(
            @RequestBody @Valid ReportFilterRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        PageResponse<ReportListItemResponse> data = reportService.getClubReports(request, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get my reports for a club
     */
    @PreAuthorize("@clubSecurity.isMemberOfClub(#request.clubId)")
    @PostMapping("/club/{clubId}/my-reports")
    public ApiResponse<PageResponse<ReportListItemResponse>> getMyReports(
            @RequestBody @Valid ReportFilterRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        PageResponse<ReportListItemResponse> data = reportService.getMyReports(request, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get all report requirements for a club with filters and pagination (for CLUB_OFFICER or TEAM_OFFICER)
     */
    @PreAuthorize("@clubSecurity.isTeamOfficerOrClubOfficerInClub(#clubId)")
    @PostMapping("/club/{clubId}/requirements/officer/filter")
    public ApiResponse<PageResponse<ReportRequirementResponse>> getClubReportRequirementsForOfficerWithFilters(
            @PathVariable Long clubId,
            @RequestBody @Valid ClubReportRequirementFilterRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        PageResponse<ReportRequirementResponse> data = reportService.getClubReportRequirementsForOfficerWithFilters(
                request, clubId, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get report of a specific club for a specific report requirement (for CLUB_OFFICER or TEAM_OFFICER)
     * Returns null if club hasn't submitted report yet
     */
    @PreAuthorize("@clubSecurity.isTeamOfficerOrClubOfficerInClub(#clubId)")
    @GetMapping("/club/{clubId}/requirements/{requirementId}/report")
    public ApiResponse<ReportDetailResponse> getClubReportByRequirementForOfficer(
            @PathVariable Long requirementId,
            @PathVariable Long clubId
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.getClubReportByRequirementForOfficer(requirementId, clubId, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get report detail by report ID for club officers (CLUB_OFFICER or TEAM_OFFICER)
     */
    @PreAuthorize("@clubSecurity.isTeamOfficerOrClubOfficerInClub(#clubId)")
    @GetMapping("/club/{clubId}/reports/{reportId}")
    public ApiResponse<ReportDetailResponse> getClubReportDetail(
            @PathVariable Long clubId,
            @PathVariable Long reportId
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.getClubReportDetail(reportId, clubId, userId);
        return ApiResponse.success(data);
    }

    /**
     * Get list of clubs that need to submit reports for a specific report requirement (for staff only)
     */
    @PreAuthorize("@clubSecurity.isStaff()")
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
    @PreAuthorize("@clubSecurity.isStaff()")
    @GetMapping("/staff/requirements/{requirementId}/clubs/{clubId}/report")
    public ApiResponse<ReportDetailResponse> getClubReportByRequirement(
            @PathVariable Long requirementId,
            @PathVariable Long clubId
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.getClubReportByRequirement(requirementId, clubId, userId);
        return ApiResponse.success(data);
    }

    /**
     * Delete a draft report (only creator can delete their own draft)
     */
    @PreAuthorize("@clubSecurity.isTeamOfficerOrClubOfficerForReport(#reportId)")
    @DeleteMapping("/club/{reportId}")
    public ApiResponse<Void> deleteReport(@PathVariable Long reportId) {
        Long userId = SecurityUtils.getCurrentUserId();
        reportService.deleteReport(reportId, userId);
        return ApiResponse.success();
    }

    /**
     * Review (approve/reject) a report at club level (for club president only)
     * Approve: PENDING_CLUB -> PENDING_UNIVERSITY
     * Reject: PENDING_CLUB -> REJECTED_CLUB
     */
    @PreAuthorize("@clubSecurity.isTeamOfficerInClub(#request.reportId)")
    @PostMapping(value = "/club/review", consumes = "application/json")
    public ApiResponse<ReportDetailResponse> reviewReportByClub(
            @RequestBody @Valid ReportReviewRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportDetailResponse data = reportService.reviewReportByClub(request, userId);
        return ApiResponse.success(data);
    }

    /**
     * Assign a team to a report requirement (for CLUB_OFFICER only)
     */
    @PreAuthorize("@clubSecurity.isClubOfficerInClub(#clubId)")
    @PostMapping("/club/{clubId}/requirements/assign-team")
    public ApiResponse<ReportRequirementResponse> assignTeamToReportRequirement(
            @PathVariable Long clubId,
            @RequestBody @Valid AssignTeamToReportRequirementRequest request
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportRequirementResponse data = reportService.assignTeamToReportRequirement(
                request.getClubReportRequirementId(),
                request.getTeamId(),
                clubId,
                userId
        );
        return ApiResponse.success(data);
    }
}
