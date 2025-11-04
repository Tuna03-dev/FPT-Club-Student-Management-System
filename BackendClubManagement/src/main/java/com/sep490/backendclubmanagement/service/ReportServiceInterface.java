package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateReportRequirementRequest;
import com.sep490.backendclubmanagement.dto.request.ReportFilterRequest;
import com.sep490.backendclubmanagement.dto.request.ReportReviewRequest;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.dto.response.ReportDetailResponse;
import com.sep490.backendclubmanagement.dto.response.ReportListItemResponse;
import com.sep490.backendclubmanagement.dto.response.ReportRequirementResponse;

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
     * @param userId Current user ID
     * @return Created report requirement response with club requirements
     */
    ReportRequirementResponse createReportRequirement(CreateReportRequirementRequest request, Long userId);
}

