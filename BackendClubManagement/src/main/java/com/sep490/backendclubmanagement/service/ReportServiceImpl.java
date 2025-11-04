package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.ReportFilterRequest;
import com.sep490.backendclubmanagement.dto.request.ReportReviewRequest;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.dto.response.ReportDetailResponse;
import com.sep490.backendclubmanagement.dto.response.ReportListItemResponse;
import com.sep490.backendclubmanagement.entity.ClubReportRequirement;
import com.sep490.backendclubmanagement.entity.ClubReportRequirementStatus;
import com.sep490.backendclubmanagement.entity.Report;
import com.sep490.backendclubmanagement.entity.ReportStatus;
import com.sep490.backendclubmanagement.exception.ForbiddenException;
import com.sep490.backendclubmanagement.exception.NotFoundException;
import com.sep490.backendclubmanagement.mapper.ReportMapper;
import com.sep490.backendclubmanagement.repository.ClubReportRequirementRepository;
import com.sep490.backendclubmanagement.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportServiceInterface {

    private final ReportRepository reportRepository;
    private final ClubReportRequirementRepository clubReportRequirementRepository;
    private final RoleService roleService;
    private final ReportMapper reportMapper;

    /**
     * Get all reports with filters and pagination (for staff only)
     */
    @Override
    public PageResponse<ReportListItemResponse> getAllReports(ReportFilterRequest request, Long userId) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can view report list");
        }

        Pageable pageable = request.getPageable("submittedDate,desc");
        Page<Report> reportPage = reportRepository.findAllWithFilters(
                request.getStatus(),
                request.getClubId(),
                request.getSemesterId(),
                request.getReportType(),
                request.getKeyword(),
                pageable
        );

        return PageResponse.of(reportPage.map(reportMapper::toListItem));
    }

    /**
     * Get report detail by ID (for staff only)
     */
    @Override
    public ReportDetailResponse getReportDetail(Long reportId, Long userId) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can view report details");
        }

        Report report = reportRepository.findByIdWithRelations(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + reportId));

        return reportMapper.toDetail(report);
    }

    /**
     * Review (approve/reject) a report (for staff only)
     * Updates ClubReportRequirement status instead of Report status
     */
    @Override
    @Transactional
    public void reviewReport(ReportReviewRequest request, Long userId) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can review reports");
        }

        Report report = reportRepository.findByIdWithRelations(request.getReportId())
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + request.getReportId()));

        // Only allow reviewing reports with status SUBMITTED
        if (report.getStatus() != ReportStatus.SUBMITTED) {
            throw new ForbiddenException(
                    "Only reports with status SUBMITTED can be reviewed. " +
                    "Current status: " + report.getStatus()
            );
        }

        // Validate status - convert ReportStatus to ClubReportRequirementStatus
        ClubReportRequirementStatus clubReportRequirementStatus;
        if (request.getStatus() == ReportStatus.APPROVED) {
            clubReportRequirementStatus = ClubReportRequirementStatus.APPROVED;
        } else if (request.getStatus() == ReportStatus.REJECTED) {
            clubReportRequirementStatus = ClubReportRequirementStatus.REJECTED;
        } else {
            throw new ForbiddenException("Status must be APPROVED or REJECTED");
        }

        // Find ClubReportRequirement by club and submissionReportRequirement
        if (report.getClub() == null) {
            throw new NotFoundException("Report must have an associated club");
        }
        if (report.getReportRequirement() == null) {
            throw new NotFoundException("Report must have an associated submission report requirement");
        }

        ClubReportRequirement clubReportRequirement = clubReportRequirementRepository
                .findByClubIdAndSubmissionReportRequirementId(
                        report.getClub().getId(),
                        report.getReportRequirement().getId()
                )
                .orElseThrow(() -> new NotFoundException(
                        "ClubReportRequirement not found for clubId: " + report.getClub().getId() +
                        " and submissionReportRequirementId: " + report.getReportRequirement().getId()
                ));

        // Update ClubReportRequirement status
        clubReportRequirement.setStatus(clubReportRequirementStatus);
        if (request.getReviewerFeedback() != null) {
            clubReportRequirement.setNote(request.getReviewerFeedback());
        }

        clubReportRequirementRepository.save(clubReportRequirement);

        // Update report reviewed date and feedback (for tracking purposes)
        report.setReviewedDate(LocalDateTime.now());
        if (request.getReviewerFeedback() != null) {
            report.setReviewerFeedback(request.getReviewerFeedback());
        }
        reportRepository.save(report);

        log.info("Staff {} has {} ClubReportRequirement for report {}", userId, clubReportRequirementStatus, request.getReportId());
    }
}

