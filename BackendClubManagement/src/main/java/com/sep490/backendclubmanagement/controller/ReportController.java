package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.ReportFilterRequest;
import com.sep490.backendclubmanagement.dto.request.ReportReviewRequest;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.dto.response.ReportDetailResponse;
import com.sep490.backendclubmanagement.dto.response.ReportListItemResponse;
import com.sep490.backendclubmanagement.service.ReportServiceInterface;
import com.sep490.backendclubmanagement.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportServiceInterface reportService;

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
}

