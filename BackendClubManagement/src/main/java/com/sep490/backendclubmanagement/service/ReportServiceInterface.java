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
     * @param request Create request containing report details
     * @param userId Current user ID
     * @return Created report detail response
     */
    ReportDetailResponse createReport(CreateReportRequest request, Long userId);

    /**
     * Update a draft report
     * @param reportId Report ID
     * @param request Update request containing report details
     * @param userId Current user ID
     * @return Updated report detail response
     */
    ReportDetailResponse updateReport(Long reportId, UpdateReportRequest request, Long userId);

    /**
     * Submit a draft report (club president only)
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
     * Get report of a specific club for a specific report requirement (for CLUB_OFFICER or TEAM_OFFICER)
     * @param requirementId Submission report requirement ID
     * @param clubId Club ID
     * @param userId Current user ID
     * @return Report detail response if exists, null otherwise
     */
    ReportDetailResponse getClubReportByRequirementForOfficer(Long requirementId, Long clubId, Long userId);
}

