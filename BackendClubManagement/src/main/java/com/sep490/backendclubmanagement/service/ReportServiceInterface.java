package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateReportRequirementRequest;
import com.sep490.backendclubmanagement.dto.request.CreateReportRequest;
import com.sep490.backendclubmanagement.dto.request.ReportFilterRequest;
import com.sep490.backendclubmanagement.dto.request.ReportReviewRequest;
import com.sep490.backendclubmanagement.dto.request.SubmitReportRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateReportRequest;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.dto.response.ReportDetailResponse;
import com.sep490.backendclubmanagement.dto.response.ReportListItemResponse;
import com.sep490.backendclubmanagement.dto.response.ReportRequirementResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Interface for Report Service
 */
public interface ReportServiceInterface {

    /**
     * Get all reports with filters and pagination (for staff only)
     * @param request Filter request containing status, clubId, semesterId, reportType, keyword, and pagination
     * @param userId Current user ID
     * @return Page response containing list of reports
     */
    PageResponse<ReportListItemResponse> getAllReports(ReportFilterRequest request, Long userId);

    /**
     * Get report detail by ID (for staff only)
     * @param reportId Report ID
     * @param userId Current user ID
     * @return Report detail response
     */
    ReportDetailResponse getReportDetail(Long reportId, Long userId);

    /**
     * Review (approve/reject) a report (for staff only)
     * @param request Review request containing reportId, status (APPROVED/REJECTED), and optional feedback
     * @param userId Current user ID
     */
    void reviewReport(ReportReviewRequest request, Long userId);

    /**
     * Create report requirement for multiple clubs (for staff only)
     * @param request Create request containing requirement details and list of club IDs
     * @param file Optional template file to upload
     * @param userId Current user ID
     * @return Created report requirement response with club requirements
     */
    ReportRequirementResponse createReportRequirement(CreateReportRequirementRequest request, MultipartFile file, Long userId);

    /**
     * Create a report (draft for team officer, can submit for club president)
     * If autoSubmit is true (or null/default) and user is club president, the report will be automatically submitted.
     * If autoSubmit is false and user is club president, the report will be created as draft.
     * Team officer can only create draft reports regardless of autoSubmit flag.
     * @param request Create request containing report details and optional autoSubmit flag
     * @param userId Current user ID
     * @return Created report detail response
     */
    ReportDetailResponse createReport(CreateReportRequest request, Long userId);

    /**
     * Create a report with file upload (draft for team officer, can submit for club president)
     * If autoSubmit is true (or null/default) and user is club president, the report will be automatically submitted.
     * If autoSubmit is false and user is club president, the report will be created as draft.
     * Team officer can only create draft reports regardless of autoSubmit flag.
     * @param request Create request containing report details and optional autoSubmit flag
     * @param file Optional file to upload (will be uploaded to Cloudinary and fileUrl will be set automatically)
     * @param userId Current user ID
     * @return Created report detail response
     */
    ReportDetailResponse createReportWithFile(CreateReportRequest request, MultipartFile file, Long userId);

    /**
     * Update a draft report
     * @param reportId Report ID
     * @param request Update request containing report details
     * @param userId Current user ID
     * @return Updated report detail response
     */
    ReportDetailResponse updateReport(Long reportId, UpdateReportRequest request, Long userId);

    /**
     * Update a draft report with file upload
     * @param reportId Report ID
     * @param request Update request containing report details
     * @param file Optional file to upload (will be uploaded to Cloudinary and fileUrl will be set automatically)
     * @param userId Current user ID
     * @return Updated report detail response
     */
    ReportDetailResponse updateReportWithFile(Long reportId, UpdateReportRequest request, MultipartFile file, Long userId);

    /**
     * Submit a draft report (club president or team officer who is the creator)
     * @param request Submit request containing report ID
     * @param userId Current user ID
     * @return Submitted report detail response
     */
    ReportDetailResponse submitReport(SubmitReportRequest request, Long userId);

    /**
     * Get all reports for a club (club president can see all, team officer can see their own)
     * @param clubId Club ID
     * @param userId Current user ID
     * @return List of report list item responses
     */
    List<ReportListItemResponse> getClubReports(Long clubId, Long userId);

    /**
     * Get my draft reports for a club
     * @param clubId Club ID
     * @param userId Current user ID
     * @return List of draft report list item responses
     */
    List<ReportListItemResponse> getMyDraftReports(Long clubId, Long userId);

    /**
     * Get all report requirements with filters and pagination (for staff only)
     * @param request Filter request containing reportType, clubId, keyword, and pagination
     * @param userId Current user ID
     * @return Page response containing list of report requirements
     */
    PageResponse<ReportRequirementResponse> getAllReportRequirements(
            com.sep490.backendclubmanagement.dto.request.ReportRequirementFilterRequest request,
            Long userId
    );

    /**
     * Get list of clubs that need to submit reports for a specific report requirement (for staff only)
     * @param requirementId Submission report requirement ID
     * @param userId Current user ID
     * @return List of club requirement info containing club details and status
     */
    List<ReportRequirementResponse.ClubRequirementInfo> getClubsByReportRequirement(Long requirementId, Long userId);

    /**
     * Get report of a specific club for a specific report requirement (for staff only)
     * @param requirementId Submission report requirement ID
     * @param clubId Club ID
     * @param userId Current user ID
     * @return Report detail response if exists, null otherwise
     */
    ReportDetailResponse getClubReportByRequirement(Long requirementId, Long clubId, Long userId);

    /**
     * Get all report requirements for a club (for club members)
     * @param clubId Club ID
     * @param userId Current user ID
     * @return List of report requirement responses assigned to the club
     */
    List<ReportRequirementResponse> getClubReportRequirements(Long clubId, Long userId);

    /**
     * Get all report requirements for a club (for CLUB_OFFICER or TEAM_OFFICER)
     * @param clubId Club ID
     * @param userId Current user ID
     * @return List of report requirement responses assigned to the club
     */
    List<ReportRequirementResponse> getClubReportRequirementsForOfficer(Long clubId, Long userId);

    /**
     * Get all report requirements for a club with filters and pagination (for CLUB_OFFICER or TEAM_OFFICER)
     * @param request Filter request containing status, semesterId, keyword, and pagination
     * @param clubId Club ID
     * @param userId Current user ID
     * @return Page response containing list of report requirement responses assigned to the club
     */
    PageResponse<ReportRequirementResponse> getClubReportRequirementsForOfficerWithFilters(
            com.sep490.backendclubmanagement.dto.request.ClubReportRequirementFilterRequest request,
            Long clubId,
            Long userId
    );

    /**
     * Get report of a specific club for a specific report requirement (for CLUB_OFFICER or TEAM_OFFICER)
     * @param requirementId Submission report requirement ID
     * @param clubId Club ID
     * @param userId Current user ID
     * @return Report detail response if exists, null otherwise
     */
    ReportDetailResponse getClubReportByRequirementForOfficer(Long requirementId, Long clubId, Long userId);

    /**
     * Delete a draft report (only creator or team officer can delete their own draft)
     * @param reportId Report ID
     * @param userId Current user ID
     */
    void deleteReport(Long reportId, Long userId);

    /**
     * Review (approve/reject) a report at club level (for club president only)
     * Approve: PENDING_CLUB -> PENDING_UNIVERSITY
     * Reject: PENDING_CLUB -> REJECTED_CLUB
     * @param request Review request containing report ID, status, and optional feedback
     * @param userId Current user ID
     * @return Updated report detail response
     */
    ReportDetailResponse reviewReportByClub(ReportReviewRequest request, Long userId);

    /**
     * Get report detail by report ID for club officers (CLUB_OFFICER or TEAM_OFFICER)
     * @param reportId Report ID
     * @param clubId Club ID
     * @param userId Current user ID
     * @return Report detail response
     */
    ReportDetailResponse getClubReportDetail(Long reportId, Long clubId, Long userId);

    /**
     * Assign a team to a report requirement (for CLUB_OFFICER only)
     * @param clubReportRequirementId Club Report Requirement ID
     * @param teamId Team ID to assign
     * @param clubId Club ID
     * @param userId Current user ID
     * @return Updated report requirement response
     */
    ReportRequirementResponse assignTeamToReportRequirement(Long clubReportRequirementId, Long teamId, Long clubId, Long userId);
}

