package com.sep490.backendclubmanagement.service;

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
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.exception.ForbiddenException;
import com.sep490.backendclubmanagement.exception.NotFoundException;
import com.sep490.backendclubmanagement.mapper.ReportMapper;
import com.sep490.backendclubmanagement.mapper.SubmissionReportRequirementMapper;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.ClubReportRequirementRepository;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.EventRepository;
import com.sep490.backendclubmanagement.repository.ReportRepository;
import com.sep490.backendclubmanagement.repository.RoleMemberShipRepository;
import com.sep490.backendclubmanagement.repository.SemesterRepository;
import com.sep490.backendclubmanagement.repository.SubmissionReportRequirementRepository;
import com.sep490.backendclubmanagement.repository.TeamRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportServiceInterface {

    private final ReportRepository reportRepository;
    private final ClubReportRequirementRepository clubReportRequirementRepository;
    private final SubmissionReportRequirementRepository submissionReportRequirementRepository;
    private final ClubRepository clubRepository;
    private final ClubMemberShipRepository clubMemberShipRepository;
    private final EventRepository eventRepository;
    private final RoleService roleService;
    private final ReportMapper reportMapper;
    private final SubmissionReportRequirementMapper submissionReportRequirementMapper;
    private final RoleMemberShipRepository roleMemberShipRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final TeamRepository teamRepository;
    private final NotificationService notificationService;

    /**
     * Get all reports with filters and pagination (for staff only)
     * Only returns reports with university-level status: PENDING_UNIVERSITY, APPROVED_UNIVERSITY, REJECTED_UNIVERSITY, RESUBMITTED_UNIVERSITY
     */
    @Override
    public PageResponse<ReportListItemResponse> getAllReports(
            ReportStatus status, Long clubId, Long semesterId, ReportType reportType,
            String keyword, Pageable pageable, Long userId) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can view report list");
        }

        // Staff can only view university-level reports
        // If status is provided, validate it's a university-level status
        if (status != null) {
            if (status != ReportStatus.PENDING_UNIVERSITY
                    && status != ReportStatus.APPROVED_UNIVERSITY
                    && status != ReportStatus.REJECTED_UNIVERSITY
                    && status != ReportStatus.RESUBMITTED_UNIVERSITY) {
                throw new ForbiddenException(
                        "Staff can only view reports with status: PENDING_UNIVERSITY, APPROVED_UNIVERSITY, REJECTED_UNIVERSITY, or RESUBMITTED_UNIVERSITY"
                );
            }
        }

        Page<Report> reportPage;

        // If keyword is provided, use client-side filtering with Vietnamese normalization
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmedKeyword = keyword.trim();
            // Get all reports without keyword filter
            reportPage = reportRepository.findAllWithFilters(
                    status,
                    clubId,
                    semesterId,
                    reportType,
                    null,
                    PageRequest.of(0, Integer.MAX_VALUE)
            );

            // Filter using Vietnamese normalization
            List<Report> filteredList = reportPage.getContent().stream()
                    .filter(report -> {
                        String title = normalizeVietnamese(report.getReportTitle() != null ? report.getReportTitle() : "");
                        String content = normalizeVietnamese(report.getContent() != null ? report.getContent() : "");

                        // Split keyword into individual words for better matching
                        String[] keywords = trimmedKeyword.split("\\s+");
                        for (String kw : keywords) {
                            String normalizedKw = normalizeVietnamese(kw);
                            if (title.contains(normalizedKw) || content.contains(normalizedKw)) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            // Apply pagination manually
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), filteredList.size());
            List<Report> paginatedList = start >= filteredList.size() ?
                    Collections.emptyList() : filteredList.subList(start, end);
            reportPage = new PageImpl<>(paginatedList, pageable, filteredList.size());
        } else {
            reportPage = reportRepository.findAllWithFilters(
                    status,
                    clubId,
                    semesterId,
                    reportType,
                    keyword,
                    pageable
            );
        }

        // Filter to only include university-level reports
        List<Report> filteredReports = reportPage.getContent().stream()
                .filter(report ->
                        report.getStatus() == ReportStatus.PENDING_UNIVERSITY
                                || report.getStatus() == ReportStatus.APPROVED_UNIVERSITY
                                || report.getStatus() == ReportStatus.REJECTED_UNIVERSITY
                                || report.getStatus() == ReportStatus.RESUBMITTED_UNIVERSITY
                )
                .toList();

        // Map to response
        List<ReportListItemResponse> filteredContent = filteredReports.stream()
                .map(reportMapper::toListItem)
                .toList();

        // Create PageResponse with filtered content
        // Note: totalElements and totalPages reflect the filtered results
        return PageResponse.<ReportListItemResponse>builder()
                .content(filteredContent)
                .pageNumber(reportPage.getNumber())
                .pageSize(reportPage.getSize())
                .totalElements(filteredContent.size())
                .totalPages((int) Math.ceil((double) filteredContent.size() / reportPage.getSize()))
                .hasNext(reportPage.getNumber() < reportPage.getTotalPages() - 1 && filteredContent.size() == reportPage.getSize())
                .hasPrevious(reportPage.getNumber() > 0)
                .build();
    }

    /**
     * Get report detail by ID (for staff only)
     * Only allows viewing reports with university-level status
     */
    @Override
    public ReportDetailResponse getReportDetail(Long reportId, Long userId) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can view report details");
        }

        Report report = reportRepository.findByIdWithRelations(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + reportId));

        // Staff can only view university-level reports
        if (report.getStatus() != ReportStatus.PENDING_UNIVERSITY
                && report.getStatus() != ReportStatus.APPROVED_UNIVERSITY
                && report.getStatus() != ReportStatus.REJECTED_UNIVERSITY
                && report.getStatus() != ReportStatus.RESUBMITTED_UNIVERSITY) {
            throw new ForbiddenException(
                    "Staff can only view reports with status: PENDING_UNIVERSITY, APPROVED_UNIVERSITY, REJECTED_UNIVERSITY, or RESUBMITTED_UNIVERSITY. " +
                    "Current status: " + report.getStatus()
            );
        }

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

        // Only allow reviewing reports with status PENDING_UNIVERSITY, or RESUBMITTED_UNIVERSITY
        if (report.getStatus() != ReportStatus.PENDING_UNIVERSITY
                && report.getStatus() != ReportStatus.RESUBMITTED_UNIVERSITY) {
            throw new ForbiddenException(
                    "Only reports with status PENDING_UNIVERSITY, or RESUBMITTED_UNIVERSITY can be reviewed. " +
                    "Current status: " + report.getStatus()
            );
        }

        // Validate status and update report status accordingly
        // Staff only handles university-level reviews
        ReportStatus newReportStatus;
        
        if (request.getStatus() == ReportStatus.APPROVED_UNIVERSITY) {
            newReportStatus = ReportStatus.APPROVED_UNIVERSITY;
        } else if (request.getStatus() == ReportStatus.REJECTED_UNIVERSITY) {
            newReportStatus = ReportStatus.REJECTED_UNIVERSITY;
        } else {
            throw new ForbiddenException(
                    "Staff can only approve or reject reports. Status must be APPROVED_UNIVERSITY or REJECTED_UNIVERSITY. " +
                    "Current report status: " + report.getStatus()
            );
        }
        
        // Update report status
        report.setStatus(newReportStatus);

        // Get ClubReportRequirement from report to update note if needed
        if (report.getClubReportRequirement() != null && request.getReviewerFeedback() != null) {
            ClubReportRequirement clubReportRequirement = report.getClubReportRequirement();
            clubReportRequirementRepository.save(clubReportRequirement);
        }

        // Update report reviewed date and feedback (for tracking purposes)
        report.setReviewedDate(LocalDateTime.now());
        if (request.getReviewerFeedback() != null) {
            report.setReviewerFeedback(request.getReviewerFeedback());
        }
        
        // Handle mustResubmit field
        if (newReportStatus == ReportStatus.APPROVED_UNIVERSITY) {
            // When approving, set mustResubmit to false
            report.setMustResubmit(false);
        } else if (newReportStatus == ReportStatus.REJECTED_UNIVERSITY) {
            // When rejecting, use mustResubmit from request if provided, otherwise default to true
            if (request.getMustResubmit() != null) {
                report.setMustResubmit(request.getMustResubmit());
            } else {
                report.setMustResubmit(true);
            }
        }
        
        reportRepository.save(report);

        log.info("Staff {} has reviewed report {} with status {}", userId, request.getReportId(), newReportStatus);

        // Send notification to club officers and report creator
        try {
            if (report.getClubReportRequirement() != null && report.getClubReportRequirement().getClub() != null) {
                Club club = report.getClubReportRequirement().getClub();
                Long reportClubId = club.getId();
                String reportTitle = report.getReportTitle() != null ? report.getReportTitle() : "Báo cáo";
                String actionUrl = "/reports/" + report.getId();

                // Get recipients: club officers + creator
                List<Long> officerIds = getClubOfficersInCurrentSemester(reportClubId);
                List<Long> recipientIds = new ArrayList<>(officerIds);

                // Add creator if not already in the list
                if (report.getCreatedBy() != null) {
                    Long creatorId = report.getCreatedBy().getId();
                    if (!recipientIds.contains(creatorId)) {
                        recipientIds.add(creatorId);
                    }
                }

                if (!recipientIds.isEmpty()) {
                    String title = "";
                    String message = "";
                    NotificationType notificationType = null;
                    NotificationPriority priority = NotificationPriority.NORMAL;

                    if (newReportStatus == ReportStatus.APPROVED_UNIVERSITY) {
                        title = "Báo cáo được nhà trường phê duyệt";
                        message = "Báo cáo \"" + reportTitle + "\" của CLB " + club.getClubName() + " đã được nhà trường phê duyệt.";
                        notificationType = NotificationType.REPORT_APPROVED;
                        priority = NotificationPriority.HIGH;
                    } else if (newReportStatus == ReportStatus.REJECTED_UNIVERSITY) {
                        title = "Báo cáo bị nhà trường từ chối";
                        message = "Báo cáo \"" + reportTitle + "\" của CLB " + club.getClubName() + " đã bị nhà trường từ chối.";

                        if (request.getReviewerFeedback() != null && !request.getReviewerFeedback().trim().isEmpty()) {
                            message += " Phản hồi: " + request.getReviewerFeedback();
                        }

                        if (report.isMustResubmit()) {
                            message += " Vui lòng chỉnh sửa và nộp lại.";
                        }

                        notificationType = NotificationType.REPORT_REJECTED;
                    }

                    if (notificationType != null) {
                        notificationService.sendToUsers(
                                recipientIds,
                                userId,
                                title,
                                message,
                                notificationType,
                                priority,
                                actionUrl,
                                reportClubId,
                                null,
                                null,
                                null
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to send staff review notification: {}", e.getMessage());
        }
    }

    /**
     * Create report requirement for multiple clubs (for staff only)
     */
    @Override
    @Transactional
    public ReportRequirementResponse createReportRequirement(CreateReportRequirementRequest request, MultipartFile file, Long userId) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can create report requirements");
        }

        // Validate and get event if provided
        Event event = null;
        if (request.getEventId() != null) {
            event = eventRepository.findById(request.getEventId())
                    .orElseThrow(() -> new NotFoundException("Event not found with ID: " + request.getEventId()));
        }

        // Get user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found with ID: " + userId));

        // Upload file if provided and get URL
        String templateUrl = request.getTemplateUrl();
        if (file != null && !file.isEmpty()) {
            try {
                CloudinaryService.UploadResult uploadResult = cloudinaryService.uploadFile(file);
                templateUrl = uploadResult.url();
                log.info("Uploaded template file for report requirement: {}", templateUrl);
            } catch (Exception e) {
                log.error("Failed to upload template file: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to upload template file: " + e.getMessage(), e);
            }
        }

        // Create SubmissionReportRequirement
        SubmissionReportRequirement submissionRequirement = SubmissionReportRequirement.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .reportType(request.getReportType())
                .templateUrl(templateUrl)
                .event(event)
                .createdBy(user)
                .build();

        SubmissionReportRequirement savedSubmissionRequirement = submissionReportRequirementRepository.save(submissionRequirement);

        // Validate and get all clubs
        List<Club> clubs = clubRepository.findAllById(request.getClubIds());
        if (clubs.size() != request.getClubIds().size()) {
            throw new NotFoundException("One or more clubs not found");
        }

        // Create ClubReportRequirement for each club
        List<ReportRequirementResponse.ClubRequirementInfo> clubRequirementInfos = new ArrayList<>();
        for (Club club : clubs) {
            ClubReportRequirement clubRequirement = ClubReportRequirement.builder()
                    .club(club)
                    .submissionReportRequirement(savedSubmissionRequirement)
                    .build();

            ClubReportRequirement savedClubRequirement = clubReportRequirementRepository.save(clubRequirement);
            
            clubRequirementInfos.add(ReportRequirementResponse.ClubRequirementInfo.builder()
                    .id(savedClubRequirement.getId())
                    .clubId(club.getId())
                    .clubName(club.getClubName())
                    .clubCode(club.getClubCode())
                    .teamId(savedClubRequirement.getTeamId())
                    .build());
        }

        log.info("Staff {} has created report requirement {} for {} clubs", userId, savedSubmissionRequirement.getId(), clubs.size());

        // Map SubmissionReportRequirement to response using mapper
        ReportRequirementResponse response = submissionReportRequirementMapper.toDto(savedSubmissionRequirement);
        
        // Set clubRequirements (not mapped by mapper as it comes from ClubReportRequirement)
        response.setClubRequirements(clubRequirementInfos);

        // Send notification to club officers of affected clubs
        try {
            String requirementTitle = request.getTitle() != null ? request.getTitle() : "Yêu cầu báo cáo mới";
            String actionUrl = "/report-requirements/" + savedSubmissionRequirement.getId();

            for (Club club : clubs) {
                List<Long> officerIds = getClubOfficersInCurrentSemester(club.getId());

                if (!officerIds.isEmpty()) {
                    String title = "Yêu cầu báo cáo mới từ nhà trường";
                    String message = "CLB " + club.getClubName() + " có yêu cầu báo cáo mới: \"" + requirementTitle + "\"";

                    if (request.getDueDate() != null) {
                        message += ". Hạn nộp: " + request.getDueDate();
                    }

                    notificationService.sendToUsers(
                            officerIds,
                            userId,
                            title,
                            message,
                            NotificationType.SYSTEM_ANNOUNCEMENT,
                            NotificationPriority.HIGH,
                            actionUrl,
                            club.getId(),
                            null,
                            null,
                            null
                    );
                }
            }
        } catch (Exception e) {
            log.error("Failed to send report requirement notification: {}", e.getMessage());
        }

        return response;
    }

    /**
     * Create a report (draft for team officer, can submit for club president)
     * If autoSubmit is true and user is club president, the report will be automatically submitted
     */
    @Override
    @Transactional
    public ReportDetailResponse createReport(CreateReportRequest request, Long userId) throws AppException{
        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new NotFoundException("Current semester not found"));

        // Validate club exists
        Club club = clubRepository.findById(request.getClubId())
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + request.getClubId()));

        // Check if club is active (only active clubs can create reports)
        if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        // Validate report requirement exists
        SubmissionReportRequirement reportRequirement = submissionReportRequirementRepository.findById(request.getReportRequirementId())
                .orElseThrow(() -> new NotFoundException("Report requirement not found with ID: " + request.getReportRequirementId()));

        // Get user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found with ID: " + userId));

        // Check if user is team officer or club president in current semester and active
        boolean isClubOfficerOrTeamOfficer = roleMemberShipRepository.isClubOfficerOrTeamOfficerInCurrentSemester(
                userId, request.getClubId(), currentSemester.getId());


        if (!isClubOfficerOrTeamOfficer) {
            throw new ForbiddenException(
                    "Chỉ cán bộ ban (team officer) hoặc chủ nhiệm câu lạc bộ (club president) " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền tạo báo cáo."
            );
        }

        // Find or get ClubReportRequirement for this club and submission requirement
        // Fetch report if exists to properly check if report already exists
        ClubReportRequirement clubReportRequirement = clubReportRequirementRepository
                .findByClubIdAndSubmissionReportRequirementId(request.getClubId(), request.getReportRequirementId())
                .orElseThrow(() -> new NotFoundException(
                        "ClubReportRequirement not found for clubId: " + request.getClubId() +
                        " and submissionReportRequirementId: " + request.getReportRequirementId()
                ));

        // Check if a report already exists for this ClubReportRequirement
        if (clubReportRequirement.getReport() != null) {
            throw new ForbiddenException("Báo cáo cho yêu cầu này đã tồn tại. Vui lòng chỉnh sửa báo cáo đã có.");
        }

        // Check deadline before creating report (no existing report, so pass null)
        validateDeadlineForAction(reportRequirement, null, "tạo báo cáo");

        // Determine status based on role and autoSubmit flag
        ReportStatus status;
        boolean shouldAutoSubmit = false;

        boolean isClubOfficer = roleMemberShipRepository.isClubOfficerInCurrentSemester(
                userId, request.getClubId(), currentSemester.getId());
        if (isClubOfficer) {
            // Club president: if autoSubmit is true or null (default), create and submit directly
            // If autoSubmit is false, create as draft
            if (request.getAutoSubmit() == null || Boolean.TRUE.equals(request.getAutoSubmit())) {
                status = ReportStatus.PENDING_CLUB;
                shouldAutoSubmit = true;
            } else {
                status = ReportStatus.DRAFT;
            }
        } else {
            // Team officer: always create draft (ignore autoSubmit flag)
            status = ReportStatus.DRAFT;
        }

        // Create report with bidirectional relationship properly set
        Report report = Report.builder()
                .reportTitle(request.getReportTitle())
                .content(request.getContent())
                .fileUrl(request.getFileUrl())
                .status(status)
                .semester(currentSemester)
                .createdBy(user)
                .clubReportRequirement(clubReportRequirement)
                .build();

        if (status == ReportStatus.PENDING_CLUB) {
            report.setSubmittedDate(LocalDateTime.now());
        }

        // Set bidirectional relationship: Report -> ClubReportRequirement (already set in builder)
        // and ClubReportRequirement -> Report
        // This ensures the relationship is properly maintained on both sides in memory
        clubReportRequirement.setReport(report);

        // Save Report (Report is the owning side with the foreign key club_report_requirement_id)
        // The foreign key will be set when saving Report
        // Note: We don't need to save ClubReportRequirement separately because:
        // 1. Report is the owning side (has the foreign key)
        // 2. ClubReportRequirement doesn't have a foreign key to Report
        // 3. Setting clubReportRequirement.setReport(report) is just for bidirectional relationship in memory
        Report savedReport = reportRepository.save(report);

        log.info("User {} created report {} with status {} for club {} (autoSubmit: {})", 
                userId, savedReport.getId(), status, request.getClubId(), shouldAutoSubmit);

        // If autoSubmit is true and report was created as PENDING_CLUB, the report is already submitted
        // No need to call submitReport separately as it's already in PENDING_CLUB status

        // Fetch the saved report with all relations for response
        return reportMapper.toDetail(reportRepository.findByIdWithRelations(savedReport.getId())
                .orElse(savedReport));
    }

    /**
     * Create a report with file upload (draft for team officer, can submit for club president)
     * If autoSubmit is true and user is club president, the report will be automatically submitted
     */
    @Override
    @Transactional
    public ReportDetailResponse createReportWithFile(CreateReportRequest request, MultipartFile file, Long userId) throws AppException {
        // Upload file if provided
        String fileUrl = request.getFileUrl(); // Use provided fileUrl if any
        if (file != null && !file.isEmpty()) {
            try {
                // Upload file to Cloudinary in club/reports folder
                CloudinaryService.UploadResult uploadResult = cloudinaryService.uploadFile(file, "club/reports");
                fileUrl = uploadResult.url();
                log.info("Uploaded file for report: {}", fileUrl);
            } catch (Exception e) {
                log.error("Failed to upload file for report: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
            }
        }

        // Set the uploaded file URL to request
        request.setFileUrl(fileUrl);

        // Delegate to createReport method
        return createReport(request, userId);
    }

    /**
     * Update a draft report or rejected report (for resubmission)
     */
    @Override
    @Transactional
    public ReportDetailResponse updateReport(Long reportId, UpdateReportRequest request, Long userId) throws AppException {
        // Get report with relations
        Report report = reportRepository.findByIdWithRelations(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + reportId));

        // Check if club is active
        if (report.getClubReportRequirement() != null && report.getClubReportRequirement().getClub() != null) {
            Club club = report.getClubReportRequirement().getClub();
            if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
                throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
            }
        }

        // Only allow updating draft reports, rejected reports (for resubmission), or pending club reports
        if (report.getStatus() != ReportStatus.DRAFT 
                && report.getStatus() != ReportStatus.REJECTED_CLUB 
                && report.getStatus() != ReportStatus.REJECTED_UNIVERSITY) {
            throw new ForbiddenException(
                    "Chỉ có thể cập nhật báo cáo ở trạng thái nháp (DRAFT), bị từ chối (REJECTED). " +
                    "Trạng thái hiện tại: " + report.getStatus()
            );
        }

        // Check if user is the creator
        boolean isCreator = report.getCreatedBy() != null && report.getCreatedBy().getId().equals(userId);
        
        if (!isCreator) {
            throw new ForbiddenException("Bạn không có quyền cập nhật báo cáo này. Chỉ người tạo mới được chỉnh sửa.");
        }

        // Get report requirement and check deadline
        if (report.getClubReportRequirement() != null && 
            report.getClubReportRequirement().getSubmissionReportRequirement() != null) {
            SubmissionReportRequirement reportRequirement = report.getClubReportRequirement()
                    .getSubmissionReportRequirement();
            validateDeadlineForAction(reportRequirement, report, "cập nhật báo cáo");
        }

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new NotFoundException("Current semester not found"));

        // Update report
        report.setReportTitle(request.getReportTitle());
        report.setContent(request.getContent());
        report.setFileUrl(request.getFileUrl());

        Report updatedReport = reportRepository.save(report);

        log.info("User {} updated report {}", userId, reportId);

        return reportMapper.toDetail(updatedReport);
    }

    /**
     * Update a draft report with file upload
     */
    @Override
    @Transactional
    public ReportDetailResponse updateReportWithFile(Long reportId, UpdateReportRequest request, MultipartFile file, Long userId) throws AppException{
        // Upload file if provided
        String fileUrl = request.getFileUrl(); // Use provided fileUrl if any
        if (file != null && !file.isEmpty()) {
            try {
                // Upload file to Cloudinary in club/reports folder
                CloudinaryService.UploadResult uploadResult = cloudinaryService.uploadFile(file, "club/reports");
                fileUrl = uploadResult.url();
                log.info("Uploaded file for report update: {}", fileUrl);
            } catch (Exception e) {
                log.error("Failed to upload file for report update: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
            }
        }

        // Set the uploaded file URL to request
        request.setFileUrl(fileUrl);

        // Delegate to updateReport method
        return updateReport(reportId, request, userId);
    }

    /**
     * Submit a draft report or resubmit a rejected report
     * Allowed for: club president OR team officer who is the creator
     */
    @Override
    @Transactional
    public ReportDetailResponse submitReport(SubmitReportRequest request, Long userId) throws AppException{
        // Get report with relations
        Report report = reportRepository.findByIdWithRelations(request.getReportId())
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + request.getReportId()));

        // Check if club is active
        if (report.getClubReportRequirement() == null || report.getClubReportRequirement().getClub() == null) {
            throw new NotFoundException("Report must have an associated club");
        }

        Club club = report.getClubReportRequirement().getClub();
        if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        // Only allow submitting draft reports or resubmitting rejected reports
        if (report.getStatus() != ReportStatus.DRAFT 
                && report.getStatus() != ReportStatus.REJECTED_CLUB 
                && report.getStatus() != ReportStatus.REJECTED_UNIVERSITY) {
            throw new ForbiddenException(
                    "Chỉ có thể nộp báo cáo ở trạng thái nháp (DRAFT) hoặc bị từ chối (REJECTED). " +
                    "Trạng thái hiện tại: " + report.getStatus()
            );
        }

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new NotFoundException("Current semester not found"));

        // Check if user is club president in current semester and active
        Long clubId = club.getId();
        boolean isClubOfficer = roleMemberShipRepository.isClubOfficerInCurrentSemester(
                userId, clubId, currentSemester.getId());
        
        // Check if user is team officer and creator of the report
        boolean isTeamOfficer = false;
        boolean isCreator = report.getCreatedBy() != null && report.getCreatedBy().getId().equals(userId);
        
        if (currentSemester != null && isCreator) {
            isTeamOfficer = roleMemberShipRepository.isTeamOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        if (!isClubOfficer && !(isTeamOfficer && isCreator)) {
            throw new ForbiddenException(
                    "Chỉ chủ nhiệm câu lạc bộ (club president) hoặc cán bộ ban (team officer) là người tạo " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền nộp báo cáo."
            );
        }

        // Get report requirement and check deadline
        if (report.getClubReportRequirement() != null && 
            report.getClubReportRequirement().getSubmissionReportRequirement() != null) {
            SubmissionReportRequirement reportRequirement = report.getClubReportRequirement()
                    .getSubmissionReportRequirement();
            validateDeadlineForAction(reportRequirement, report, "nộp báo cáo");
        }

        // Determine the appropriate status based on current status and user role
        ReportStatus currentStatus = report.getStatus();
        ReportStatus newStatus;
        
        if (currentStatus == ReportStatus.DRAFT) {
            // First submission: PENDING_CLUB
            newStatus = ReportStatus.PENDING_CLUB;
        } else if (currentStatus == ReportStatus.REJECTED_CLUB) {
            // Resubmission after club rejection: UPDATED_PENDING_CLUB
            newStatus = ReportStatus.UPDATED_PENDING_CLUB;
        } else if (currentStatus == ReportStatus.REJECTED_UNIVERSITY) {
            // Resubmission after university rejection:
            // - If club president: RESUBMITTED_UNIVERSITY (nộp lại lên trường)
            // - If team officer: UPDATED_PENDING_CLUB (nộp lại lên câu lạc bộ)
            if (isClubOfficer) {
                newStatus = ReportStatus.RESUBMITTED_UNIVERSITY;
            } else {
                // Team officer resubmits to club level
                newStatus = ReportStatus.UPDATED_PENDING_CLUB;
            }
        } else {
            // Fallback (should not happen due to validation above)
            newStatus = ReportStatus.PENDING_CLUB;
        }
        
        // Reset reviewerFeedback when resubmitting to university (from REJECTED_UNIVERSITY to RESUBMITTED_UNIVERSITY)
        // Only reset when club president resubmits to university level
        if (currentStatus == ReportStatus.REJECTED_UNIVERSITY && newStatus == ReportStatus.RESUBMITTED_UNIVERSITY) {
            report.setReviewerFeedback(null);
        }
        
        // Update report status
        report.setStatus(newStatus);
        report.setSubmittedDate(LocalDateTime.now());
        
        // Reset mustResubmit when report is resubmitted
       // report.setMustResubmit(false);

        Report submittedReport = reportRepository.save(report);

        // Send notification based on new status
        try {
            Long reportClubId = club.getId();
            User submitter = userRepository.findById(userId).orElse(null);
            String submitterName = submitter != null ? submitter.getFullName() : "Người dùng";
            String reportTitle = report.getReportTitle() != null ? report.getReportTitle() : "Báo cáo";
            String actionUrl = "/reports/" + report.getId();

            if (newStatus == ReportStatus.PENDING_CLUB || newStatus == ReportStatus.UPDATED_PENDING_CLUB) {
                // Notify Club Officers when report is submitted to club level
                List<Long> officerIds = getClubOfficersInCurrentSemester(reportClubId);
                List<Long> recipientIds = officerIds.stream()
                        .filter(id -> !id.equals(userId)) // Don't notify submitter
                        .collect(Collectors.toList());

                if (!recipientIds.isEmpty()) {
                    String title = "Có báo cáo mới cần duyệt";
                    String message = submitterName + " đã nộp báo cáo \"" + reportTitle + "\" cần phê duyệt.";

                    notificationService.sendToUsers(
                            recipientIds,
                            userId,
                            title,
                            message,
                            NotificationType.REPORT_SUBMITTED,
                            NotificationPriority.NORMAL,
                            actionUrl,
                            reportClubId,
                            null,
                            null,
                            null
                    );
                }
            } else if (newStatus == ReportStatus.RESUBMITTED_UNIVERSITY) {
                // Notify Staff when report is resubmitted to university level
                List<Long> staffIds = getStaffUsers();

                if (!staffIds.isEmpty()) {
                    String title = "Báo cáo được nộp lại từ CLB";
                    String message = "CLB " + club.getClubName() + " đã nộp lại báo cáo \"" + reportTitle + "\" cần xem xét.";

                    notificationService.sendToUsers(
                            staffIds,
                            userId,
                            title,
                            message,
                            NotificationType.REPORT_SUBMITTED,
                            NotificationPriority.NORMAL,
                            actionUrl,
                            reportClubId,
                            null,
                            null,
                            null
                    );
                }
            }
        } catch (Exception e) {
            log.error("Failed to send report submission notification: {}", e.getMessage());
        }

        return reportMapper.toDetail(submittedReport);
    }

    /**
     * Get all reports for a club (club president can see all)
     */
    @Override
    public PageResponse<ReportListItemResponse> getClubReports(
            Long clubId, ReportStatus status, Long semesterId, ReportType reportType,
            String keyword, Pageable pageable, Long userId) {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElse(null);

        // Check if user is club president or team officer
        boolean isClubOfficer = false;

        if (currentSemester != null) {
            isClubOfficer = roleMemberShipRepository.isClubOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        if (!isClubOfficer) {
            throw new ForbiddenException(
                    "Chỉ cán bộ chủ nhiệm câu lạc bộ (club president) " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền xem báo cáo."
            );
        }

        Page<Report> reportPage;

        // If keyword is provided, use client-side filtering with Vietnamese normalization
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmedKeyword = keyword.trim();
            // Get all reports without keyword filter
            reportPage = reportRepository.findByClubIdWithFilter(
                    status,
                    clubId,
                    semesterId,
                    reportType,
                    null,
                    PageRequest.of(0, Integer.MAX_VALUE)
            );

            // Filter using Vietnamese normalization
            List<Report> filteredList = reportPage.getContent().stream()
                    .filter(report -> {
                        String title = normalizeVietnamese(report.getReportTitle() != null ? report.getReportTitle() : "");
                        String content = normalizeVietnamese(report.getContent() != null ? report.getContent() : "");

                        // Split keyword into individual words for better matching
                        String[] keywords = trimmedKeyword.split("\\s+");
                        for (String kw : keywords) {
                            String normalizedKw = normalizeVietnamese(kw);
                            if (title.contains(normalizedKw) || content.contains(normalizedKw)) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            // Apply pagination manually
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), filteredList.size());
            List<Report> paginatedList = start >= filteredList.size() ?
                    Collections.emptyList() : filteredList.subList(start, end);
            reportPage = new PageImpl<>(paginatedList, pageable, filteredList.size());
        } else {
            reportPage = reportRepository.findByClubIdWithFilter(
                    status,
                    clubId,
                    semesterId,
                    reportType,
                    keyword,
                    pageable
            );
        }

        List<ReportListItemResponse> content = reportPage.getContent().stream()
                .map(reportMapper::toListItem)
                .toList();

        return PageResponse.<ReportListItemResponse>builder()
                .content(content)
                .pageNumber(reportPage.getNumber())
                .pageSize(reportPage.getSize())
                .totalElements(reportPage.getTotalElements())
                .totalPages(reportPage.getTotalPages())
                .hasNext(reportPage.hasNext())
                .hasPrevious(reportPage.hasPrevious())
                .build();

    }

    /**
     * Get my draft reports for a club
     */
    @Override
    public PageResponse<ReportListItemResponse> getMyReports(
            Long clubId, ReportStatus status, Long semesterId, ReportType reportType,
            String keyword, Pageable pageable, Long userId) {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElse(null);

        // Check if user is team officer or club president
        boolean isClubOfficerOrTeamOfficer = false;

        if (currentSemester != null) {
            isClubOfficerOrTeamOfficer = roleMemberShipRepository.isClubOfficerOrTeamOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        if (!isClubOfficerOrTeamOfficer) {
            throw new ForbiddenException(
                    "Chỉ cán bộ ban (team officer) hoặc cán bộ câu lạc bộ (club officer) " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền xem báo cáo nháp."
            );
        }

        Page<Report> reportPage;

        // If keyword is provided, use client-side filtering with Vietnamese normalization
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmedKeyword = keyword.trim();
            // Get all reports without keyword filter
            reportPage = reportRepository.findByClubIdAndUserIdWithFilter(
                    status,
                    clubId,
                    semesterId,
                    reportType,
                    null,
                    userId,
                    PageRequest.of(0, Integer.MAX_VALUE)
            );

            // Filter using Vietnamese normalization
            List<Report> filteredList = reportPage.getContent().stream()
                    .filter(report -> {
                        String title = normalizeVietnamese(report.getReportTitle() != null ? report.getReportTitle() : "");
                        String content = normalizeVietnamese(report.getContent() != null ? report.getContent() : "");

                        // Split keyword into individual words for better matching
                        String[] keywords = trimmedKeyword.split("\\s+");
                        for (String kw : keywords) {
                            String normalizedKw = normalizeVietnamese(kw);
                            if (title.contains(normalizedKw) || content.contains(normalizedKw)) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            // Apply pagination manually
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), filteredList.size());
            List<Report> paginatedList = start >= filteredList.size() ?
                    Collections.emptyList() : filteredList.subList(start, end);
            reportPage = new PageImpl<>(paginatedList, pageable, filteredList.size());
        } else {
            reportPage = reportRepository.findByClubIdAndUserIdWithFilter(
                    status,
                    clubId,
                    semesterId,
                    reportType,
                    keyword,
                    userId,
                    pageable
            );
        }

        List<ReportListItemResponse> content = reportPage.getContent().stream()
                .map(reportMapper::toListItem)
                .toList();

        return PageResponse.<ReportListItemResponse>builder()
                .content(content)
                .pageNumber(reportPage.getNumber())
                .pageSize(reportPage.getSize())
                .totalElements(reportPage.getTotalElements())
                .totalPages(reportPage.getTotalPages())
                .hasNext(reportPage.hasNext())
                .hasPrevious(reportPage.hasPrevious())
                .build();

    }

    /**
     * Get all report requirements with filters and pagination (for staff only)
     */
    @Override
    public PageResponse<ReportRequirementResponse> getAllReportRequirements(
            ReportType reportType, Long clubId, String keyword, Pageable pageable, Long userId) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can view report requirements");
        }

        Page<SubmissionReportRequirement> requirementPage;

        // If keyword is provided, use client-side filtering with Vietnamese normalization
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmedKeyword = keyword.trim();
            // Get all requirements without keyword filter
            requirementPage = submissionReportRequirementRepository.findAllWithFilters(
                    reportType,
                    clubId,
                    null,
                    PageRequest.of(0, Integer.MAX_VALUE)
            );

            // Filter using Vietnamese normalization
            List<SubmissionReportRequirement> filteredList = requirementPage.getContent().stream()
                    .filter(requirement -> {
                        String title = normalizeVietnamese(requirement.getTitle() != null ? requirement.getTitle() : "");
                        String description = normalizeVietnamese(requirement.getDescription() != null ? requirement.getDescription() : "");

                        // Split keyword into individual words for better matching
                        String[] keywords = trimmedKeyword.split("\\s+");
                        for (String kw : keywords) {
                            String normalizedKw = normalizeVietnamese(kw);
                            if (title.contains(normalizedKw) || description.contains(normalizedKw)) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            // Apply pagination manually
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), filteredList.size());
            List<SubmissionReportRequirement> paginatedList = start >= filteredList.size() ?
                    Collections.emptyList() : filteredList.subList(start, end);
            requirementPage = new PageImpl<>(paginatedList, pageable, filteredList.size());
        } else {
            requirementPage = submissionReportRequirementRepository.findAllWithFilters(
                    reportType,
                    clubId,
                    keyword,
                    pageable
            );
        }

        // Map to response with club requirements
        Page<ReportRequirementResponse> responsePage = requirementPage.map(requirement -> {
            ReportRequirementResponse response = submissionReportRequirementMapper.toDto(requirement);
            
            // Load club requirements for this submission requirement
            List<ClubReportRequirement> clubRequirements = clubReportRequirementRepository
                    .findBySubmissionReportRequirementId(requirement.getId());
            
            List<ReportRequirementResponse.ClubRequirementInfo> clubRequirementInfos = clubRequirements.stream()
                    .map(crr -> {
                        // Get status from report if exists, otherwise null
                        String statusStr = null;
                        if (crr.getReport() != null && crr.getReport().getStatus() != null) {
                            statusStr = crr.getReport().getStatus().name();
                        }
                        return ReportRequirementResponse.ClubRequirementInfo.builder()
                                .id(crr.getId())
                                .clubId(crr.getClub().getId())
                                .clubName(crr.getClub().getClubName())
                                .clubCode(crr.getClub().getClubCode())
                                .status(statusStr)
                                .teamId(crr.getTeamId())
                                .build();
                    })
                    .toList();
            
            response.setClubRequirements(clubRequirementInfos);
            return response;
        });

        return PageResponse.of(responsePage);
    }

    /**
     * Get list of clubs that need to submit reports for a specific report requirement (for staff only)
     */
    @Override
    public List<ReportRequirementResponse.ClubRequirementInfo> getClubsByReportRequirement(Long requirementId, Long userId) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can view clubs for report requirements");
        }

        // Validate submission report requirement exists
        SubmissionReportRequirement requirement = submissionReportRequirementRepository.findById(requirementId)
                .orElseThrow(() -> new NotFoundException("Report requirement not found with ID: " + requirementId));

        // Get all club requirements for this submission requirement
        List<ClubReportRequirement> clubRequirements = clubReportRequirementRepository
                .findBySubmissionReportRequirementId(requirementId);

        // Map to response
        return clubRequirements.stream()
                .map(crr -> {
                    // Get status from report if exists, otherwise null
                    String statusStr = null;
                    ReportRequirementResponse.ReportInfo reportInfo = null;
                    if (crr.getReport() != null) {
                        Report report = crr.getReport();
                        if (report.getStatus() != null) {
                            statusStr = report.getStatus().name();
                        }
                        // Build report info with only mustResubmit
                        ReportRequirementResponse.UserInfo createdByInfo = null;
                        if (report.getCreatedBy() != null) {
                            createdByInfo = ReportRequirementResponse.UserInfo.builder()
                                    .id(report.getCreatedBy().getId())
                                    .fullName(report.getCreatedBy().getFullName())
                                    .email(report.getCreatedBy().getEmail())
                                    .studentCode(report.getCreatedBy().getStudentCode())
                                    .build();
                        }
                        reportInfo = ReportRequirementResponse.ReportInfo.builder()
                                .mustResubmit(report.isMustResubmit())
                                .createdBy(createdByInfo)
                                .build();
                    }
                    return ReportRequirementResponse.ClubRequirementInfo.builder()
                            .id(crr.getId())
                            .clubId(crr.getClub().getId())
                            .clubName(crr.getClub().getClubName())
                            .clubCode(crr.getClub().getClubCode())
                            .status(statusStr)
                            .teamId(crr.getTeamId())
                            .report(reportInfo)
                            .build();
                })
                .toList();
    }

    /**
     * Get report of a specific club for a specific report requirement (for staff only)
     * Only returns reports with university-level status
     */
    @Override
    public ReportDetailResponse getClubReportByRequirement(Long requirementId, Long clubId, Long userId) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can view club reports");
        }

        // Validate submission report requirement exists
        SubmissionReportRequirement requirement = submissionReportRequirementRepository.findById(requirementId)
                .orElseThrow(() -> new NotFoundException("Report requirement not found with ID: " + requirementId));

        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Find report by clubId and requirementId
        Optional<Report> reportOptional = reportRepository.findByClubIdAndReportRequirementId(clubId, requirementId);

        // Return null if report doesn't exist (club hasn't submitted report yet)
        if (reportOptional.isEmpty()) {
            return null;
        }

        Report report = reportOptional.get();
        
        // Staff can only view university-level reports
        if (report.getStatus() != ReportStatus.PENDING_UNIVERSITY
                && report.getStatus() != ReportStatus.APPROVED_UNIVERSITY
                && report.getStatus() != ReportStatus.REJECTED_UNIVERSITY
                && report.getStatus() != ReportStatus.RESUBMITTED_UNIVERSITY) {
            // Return null if report is not at university level (staff cannot view club-level reports)
            return null;
        }

        return reportMapper.toDetail(report);
    }

    /**
     * Get all report requirements for a club with filters and pagination (for CLUB_OFFICER or TEAM_OFFICER)
     */
    @Override
    public PageResponse<ReportRequirementResponse> getClubReportRequirementsForOfficerWithFilters(
            Long clubId, String status, Long semesterId, String keyword, Long teamId,
            Pageable pageable, Long userId) {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElse(null);

        // Check if user is CLUB_OFFICER or TEAM_OFFICER (from club_roles table) in current semester
        boolean isClubOfficerOrTeamOfficer = false;
        Long userTeamId = null; // Team ID of team officer

        if (currentSemester != null) {
            isClubOfficerOrTeamOfficer = roleMemberShipRepository.isClubOfficerOrTeamOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
            
            // If user is team officer, get their team ID
            if (isClubOfficerOrTeamOfficer) {
                // Check if user is club president (not team officer)
                boolean isClubOfficer = roleMemberShipRepository.isClubOfficerInCurrentSemester(
                        userId, clubId, currentSemester.getId());
                
                if (!isClubOfficer) {
                    // User is team officer, get their team ID
                    userTeamId = roleMemberShipRepository.findTeamIdByUserIdAndClubIdAndSemesterId(
                            userId, clubId, currentSemester.getId()).orElse(null);
                }
            }
        }

        if (!isClubOfficerOrTeamOfficer) {
            throw new ForbiddenException(
                    "Chỉ cán bộ câu lạc bộ (CLUB_OFFICER) hoặc cán bộ ban (TEAM_OFFICER) " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền xem danh sách yêu cầu báo cáo."
            );
        }
        
        // Determine filterTeamId:
        // - If user is team officer, always use their teamId (ignore teamId param for security)
        // - If user is club officer, use teamId param if provided, otherwise null (show all)
        Long filterTeamId = userTeamId != null ? userTeamId : teamId;

        // Parse status filter
        Boolean filterUnsubmitted = null;
        Boolean filterOverdue = null;
        ReportStatus reportStatus = null;

        if (status != null && !status.isEmpty()) {
            String statusStr = status.toUpperCase();
            if ("UNSUBMITTED".equals(statusStr)) {
                filterUnsubmitted = true;
            } else if ("OVERDUE".equals(statusStr)) {
                filterOverdue = true;
            } else {
                // Try to parse as ReportStatus enum
                try {
                    reportStatus = ReportStatus.valueOf(statusStr);
                } catch (IllegalArgumentException e) {
                    // Invalid status, ignore filter
                }
            }
        }

        // Get current date for overdue filter
        LocalDate currentDate = LocalDate.now();

        // Query with filters
        Page<ClubReportRequirement> requirementPage;

        // If keyword is provided, use client-side filtering with Vietnamese normalization
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmedKeyword = keyword.trim();
            // Get all club report requirements without keyword filter
            requirementPage = clubReportRequirementRepository.findByClubIdWithFilters(
                    clubId,
                    null,
                    filterUnsubmitted,
                    filterOverdue,
                    reportStatus,
                    semesterId,
                    filterTeamId,
                    currentDate,
                    PageRequest.of(0, Integer.MAX_VALUE)
            );

            // Filter using Vietnamese normalization on the submission requirement's title and description
            List<ClubReportRequirement> filteredList = requirementPage.getContent().stream()
                    .filter(crr -> {
                        SubmissionReportRequirement srr = crr.getSubmissionReportRequirement();
                        String title = normalizeVietnamese(srr != null && srr.getTitle() != null ? srr.getTitle() : "");
                        String description = normalizeVietnamese(srr != null && srr.getDescription() != null ? srr.getDescription() : "");

                        // Split keyword into individual words for better matching
                        String[] keywords = trimmedKeyword.split("\\s+");
                        for (String kw : keywords) {
                            String normalizedKw = normalizeVietnamese(kw);
                            if (title.contains(normalizedKw) || description.contains(normalizedKw)) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            // Apply pagination manually
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), filteredList.size());
            List<ClubReportRequirement> paginatedList = start >= filteredList.size() ?
                    Collections.emptyList() : filteredList.subList(start, end);
            requirementPage = new PageImpl<>(paginatedList, pageable, filteredList.size());
        } else {
            requirementPage = clubReportRequirementRepository.findByClubIdWithFilters(
                    clubId,
                    keyword,
                    filterUnsubmitted,
                    filterOverdue,
                    reportStatus,
                    semesterId,
                    filterTeamId,
                    currentDate,
                    pageable
            );
        }

        // Map to response
        Page<ReportRequirementResponse> responsePage = requirementPage.map(crr -> {
            ReportRequirementResponse response = submissionReportRequirementMapper.toDto(crr.getSubmissionReportRequirement());
            
            // Build report info if exists
            ReportRequirementResponse.ReportInfo reportInfo = null;
            if (crr.getReport() != null) {
                Report report = crr.getReport();
                ReportRequirementResponse.UserInfo createdByInfo = null;
                if (report.getCreatedBy() != null) {
                    createdByInfo = ReportRequirementResponse.UserInfo.builder()
                            .id(report.getCreatedBy().getId())
                            .fullName(report.getCreatedBy().getFullName())
                            .email(report.getCreatedBy().getEmail())
                            .studentCode(report.getCreatedBy().getStudentCode())
                            .build();
                }
                reportInfo = ReportRequirementResponse.ReportInfo.builder()
                        .id(report.getId())
                        .reportTitle(report.getReportTitle())
                        .status(report.getStatus() != null ? report.getStatus().name() : null)
                        .submittedDate(report.getSubmittedDate())
                        .createdAt(report.getCreatedAt())
                        .updatedAt(report.getUpdatedAt())
                        .mustResubmit(report.isMustResubmit())
                        .createdBy(createdByInfo)
                        .build();
            }
            
            // Get status from report if exists, otherwise null
            String statusStr = null;
            if (crr.getReport() != null && crr.getReport().getStatus() != null) {
                statusStr = crr.getReport().getStatus().name();
            }
            
            // Add the club requirement info for this specific club
            ReportRequirementResponse.ClubRequirementInfo clubRequirementInfo = ReportRequirementResponse.ClubRequirementInfo.builder()
                    .id(crr.getId())
                    .clubId(crr.getClub().getId())
                    .clubName(crr.getClub().getClubName())
                    .clubCode(crr.getClub().getClubCode())
                    .status(statusStr)
                    .teamId(crr.getTeamId())
                    .report(reportInfo)
                    .build();
            
            response.setClubRequirements(List.of(clubRequirementInfo));
            return response;
        });

        return PageResponse.of(responsePage);
    }

    /**
     * Get report of a specific club for a specific report requirement (for CLUB_OFFICER or TEAM_OFFICER)
     */
    @Override
    public ReportDetailResponse getClubReportByRequirementForOfficer(Long requirementId, Long clubId, Long userId) {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Validate submission report requirement exists
        SubmissionReportRequirement requirement = submissionReportRequirementRepository.findById(requirementId)
                .orElseThrow(() -> new NotFoundException("Report requirement not found with ID: " + requirementId));

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElse(null);

        // Check if user is CLUB_OFFICER or TEAM_OFFICER (from club_roles table) in current semester
        boolean isClubOfficerOrTeamOfficer = false;

        if (currentSemester != null) {
            isClubOfficerOrTeamOfficer = roleMemberShipRepository.isClubOfficerOrTeamOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        if (!isClubOfficerOrTeamOfficer) {
            throw new ForbiddenException(
                    "Chỉ cán bộ câu lạc bộ (CLUB_OFFICER) hoặc cán bộ ban (TEAM_OFFICER) " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền xem chi tiết báo cáo."
            );
        }

        // Find report by clubId and requirementId
        Optional<Report> reportOptional = reportRepository.findByClubIdAndReportRequirementId(clubId, requirementId);

        // Return null if report doesn't exist (club hasn't submitted report yet)
        if (reportOptional.isEmpty()) {
            return null;
        }

        Report report = reportOptional.get();
        return reportMapper.toDetail(report);
    }

    /**
     * Delete a draft report (only creator or team officer can delete their own draft)
     */
    @Override
    @Transactional
    public void deleteReport(Long reportId, Long userId) throws AppException {
        // Get report with relations
        Report report = reportRepository.findByIdWithRelations(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + reportId));

        // Check if club is active
        if (report.getClubReportRequirement() != null && report.getClubReportRequirement().getClub() != null) {
            Club club = report.getClubReportRequirement().getClub();
            if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
                throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
            }
        }

        // Only allow deleting draft reports
        if (report.getStatus() != ReportStatus.DRAFT) {
            throw new ForbiddenException(
                    "Chỉ có thể xóa báo cáo ở trạng thái nháp (DRAFT). " +
                    "Trạng thái hiện tại: " + report.getStatus()
            );
        }

        // Check if user is the creator
        boolean isCreator = report.getCreatedBy() != null && report.getCreatedBy().getId().equals(userId);
        
        if (!isCreator) {
            throw new ForbiddenException("Bạn không có quyền xóa báo cáo này. Chỉ người tạo mới được xóa.");
        }

        // Delete the report
        reportRepository.delete(report);

        log.info("User {} deleted draft report {}", userId, reportId);
    }

    /**
     * Get report detail by report ID for (CLUB_OFFICER or TEAM_OFFICER)
     */
    @Override
    public ReportDetailResponse getClubReportDetail(Long reportId, Long clubId, Long userId) {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Get report with relations
        Report report = reportRepository.findByIdWithRelations(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + reportId));

        // Verify report belongs to the club
        if (report.getClubReportRequirement() == null || 
            !report.getClubReportRequirement().getClub().getId().equals(clubId)) {
            throw new ForbiddenException("Báo cáo không thuộc về câu lạc bộ này");
        }

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElse(null);

        // Check if user is CLUB_OFFICER or TEAM_OFFICER in current semester
        boolean isClubOfficerOrTeamOfficer = false;
        boolean isClubOfficer = false;

        if (currentSemester != null) {
            isClubOfficerOrTeamOfficer = roleMemberShipRepository.isClubOfficerOrTeamOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
            isClubOfficer = roleMemberShipRepository.isClubOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        // Check permissions
        if (!isClubOfficerOrTeamOfficer && !isClubOfficer) {
            throw new ForbiddenException(
                    "Chỉ cán bộ câu lạc bộ (CLUB_OFFICER), cán bộ ban (TEAM_OFFICER) " +
                    "hoặc chủ nhiệm câu lạc bộ (CLUB_PRESIDENT) trong kỳ hiện tại " +
                    "và đang hoạt động mới có quyền xem chi tiết báo cáo."
            );
        }

        // If user is team officer, only allow viewing their own reports
        if (isClubOfficerOrTeamOfficer && !isClubOfficer) {
            if (report.getCreatedBy() == null || !report.getCreatedBy().getId().equals(userId)) {
                throw new ForbiddenException("Bạn chỉ có thể xem báo cáo do chính bạn tạo");
            }
        }

        return reportMapper.toDetail(report);
    }

    /**
     * Review (approve/reject) a report at club level (for club president only)
     * Approve: PENDING_CLUB -> PENDING_UNIVERSITY
     * Reject: PENDING_CLUB -> REJECTED_CLUB
     */
    @Override
    @Transactional
    public ReportDetailResponse reviewReportByClub(ReportReviewRequest request, Long userId) throws AppException {
        // Get report with relations
        Report report = reportRepository.findByIdWithRelations(request.getReportId())
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + request.getReportId()));

        // Check if club is active
        if (report.getClubReportRequirement() == null || report.getClubReportRequirement().getClub() == null) {
            throw new NotFoundException("Report must have an associated club");
        }

        Club club = report.getClubReportRequirement().getClub();
        if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        // Only allow reviewing reports with status PENDING_CLUB or UPDATED_PENDING_CLUB
        if (report.getStatus() != ReportStatus.PENDING_CLUB
                && report.getStatus() != ReportStatus.UPDATED_PENDING_CLUB
                && report.getStatus() != ReportStatus.DRAFT) {
            throw new ForbiddenException(
                    "Chỉ có thể duyệt/từ chối báo cáo ở trạng thái chờ CLB phê duyệt (PENDING_CLUB,UPDATED_PENDING_CLUB,DRAFT). " +
                    "Trạng thái hiện tại: " + report.getStatus()
            );
        }

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new NotFoundException("Current semester not found"));

        // Check if user is club president in current semester and active
        Long clubId = club.getId();
        boolean isClubOfficer = roleMemberShipRepository.isClubOfficerInCurrentSemester(
                userId, clubId, currentSemester.getId());

        if (!isClubOfficer) {
            throw new ForbiddenException(
                    "Chỉ chủ nhiệm câu lạc bộ (club president) trong kỳ hiện tại và đang hoạt động " +
                    "mới có quyền duyệt/từ chối báo cáo ở cấp CLB."
            );
        }

        // Check if user is the creator
        boolean isCreator = report.getCreatedBy() != null && report.getCreatedBy().getId().equals(userId);

        if (report.getStatus() == ReportStatus.DRAFT && !isCreator) {
            throw new ForbiddenException(
                    "Người dùng không phải là người đã tạo bản nháp báo cáo này. "
            );
        }

        // Get report requirement and check deadline (only if not mustResubmit)
        if (report.getClubReportRequirement() != null && 
            report.getClubReportRequirement().getSubmissionReportRequirement() != null) {
            SubmissionReportRequirement reportRequirement = report.getClubReportRequirement()
                    .getSubmissionReportRequirement();
            validateDeadlineForAction(reportRequirement, report, "đánh giá báo cáo");
        }

        // Validate status and update report status accordingly
        ReportStatus newReportStatus;
        
        if (request.getStatus() == ReportStatus.APPROVED_CLUB) {
            // Approve: chuyển sang PENDING_UNIVERSITY để chờ nhà trường duyệt
            newReportStatus = ReportStatus.PENDING_UNIVERSITY;
        } else if (request.getStatus() == ReportStatus.REJECTED_CLUB) {
            // Reject: chuyển sang REJECTED_CLUB
            newReportStatus = ReportStatus.REJECTED_CLUB;
        } else {
            throw new ForbiddenException(
                    "Club president chỉ có thể duyệt (APPROVED_CLUB) hoặc từ chối (REJECTED_CLUB) báo cáo. " +
                    "Status được cung cấp: " + request.getStatus()
            );
        }
        
        // Update report status
        report.setStatus(newReportStatus);
        report.setReviewedDate(LocalDateTime.now());
        
        // Handle reviewerFeedback based on action
        if (newReportStatus == ReportStatus.PENDING_UNIVERSITY) {
            // When approving and submitting to university, reset reviewerFeedback to null
            // This ensures that when a report is submitted to university level, any previous feedback is cleared
            report.setReviewerFeedback(null);
        } else if (newReportStatus == ReportStatus.REJECTED_CLUB) {
            // When rejecting, set feedback if provided
            if (request.getReviewerFeedback() != null && !request.getReviewerFeedback().trim().isEmpty()) {
                report.setReviewerFeedback(request.getReviewerFeedback());
            }
        }

        Report reviewedReport = reportRepository.save(report);

        log.info("Club president {} reviewed report {} with status {}", userId, request.getReportId(), newReportStatus);

        // Send notification based on review result
        try {
            Long reviewClubId = club.getId();
            User reviewer = userRepository.findById(userId).orElse(null);
            String reportTitle = report.getReportTitle() != null ? report.getReportTitle() : "Báo cáo";

            if (newReportStatus == ReportStatus.PENDING_UNIVERSITY) {
                // Approved by club, notify Staff
                List<Long> staffIds = getStaffUsers();

                if (!staffIds.isEmpty()) {
                    String actionUrl = "/staff/reports/" + report.getId();
                    String title = "Có báo cáo mới cần duyệt";
                    String message = "CLB " + club.getClubName() + " đã gửi báo cáo \"" + reportTitle + "\" cần phê duyệt.";

                    notificationService.sendToUsers(
                            staffIds,
                            userId,
                            title,
                            message,
                            NotificationType.REPORT_SUBMITTED,
                            NotificationPriority.NORMAL,
                            actionUrl,
                            reviewClubId,
                            null,
                            null,
                            null
                    );
                }

                // Also notify the creator that report was approved by club
                if (report.getCreatedBy() != null && !report.getCreatedBy().getId().equals(userId)) {
                    Long creatorId = report.getCreatedBy().getId();
                    String actionUrl = "/reports/" + report.getId();
                    String title = "Báo cáo được CLB phê duyệt";
                    String message = "Báo cáo \"" + reportTitle + "\" của bạn đã được CLB phê duyệt và gửi lên nhà trường.";

                    notificationService.sendToUser(
                            creatorId,
                            userId,
                            title,
                            message,
                            NotificationType.REPORT_APPROVED,
                            NotificationPriority.NORMAL,
                            actionUrl,
                            reviewClubId,
                            null,
                            null,
                            null,
                            null
                    );
                }
            } else if (newReportStatus == ReportStatus.REJECTED_CLUB) {
                // Rejected by club, notify creator
                if (report.getCreatedBy() != null) {
                    Long creatorId = report.getCreatedBy().getId();
                    String actionUrl = "/reports/" + report.getId();
                    String title = "Báo cáo bị từ chối";
                    String message = "Báo cáo \"" + reportTitle + "\" của bạn đã bị CLB từ chối.";

                    if (request.getReviewerFeedback() != null && !request.getReviewerFeedback().trim().isEmpty()) {
                        message += " Phản hồi: " + request.getReviewerFeedback();
                    }

                    notificationService.sendToUser(
                            creatorId,
                            userId,
                            title,
                            message,
                            NotificationType.REPORT_REJECTED,
                            NotificationPriority.NORMAL,
                            actionUrl,
                            reviewClubId,
                            null,
                            null,
                            null,
                            null
                    );
                }
            }
        } catch (Exception e) {
            log.error("Failed to send report review notification: {}", e.getMessage());
        }

        return reportMapper.toDetail(reviewedReport);
    }

    /**
     * Assign a team to a report requirement (for CLUB_OFFICER only)
     */
    @Override
    @Transactional
    public ReportRequirementResponse assignTeamToReportRequirement(
            Long clubReportRequirementId,
            Long teamId,
            Long clubId,
            Long userId
    ) throws AppException {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Check if club is active (only active clubs can assign teams)
        if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElse(null);

        // Check if user is CLUB_OFFICER (club president) in current semester
        boolean isClubOfficer = false;
        if (currentSemester != null) {
            isClubOfficer = roleMemberShipRepository.isClubOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        if (!isClubOfficer) {
            throw new ForbiddenException(
                    "Chỉ chủ nhiệm câu lạc bộ (CLUB_OFFICER) trong kỳ hiện tại và đang hoạt động " +
                    "mới có quyền gán team cho yêu cầu báo cáo."
            );
        }

        // Validate ClubReportRequirement exists and belongs to the club
        ClubReportRequirement clubReportRequirement = clubReportRequirementRepository.findById(clubReportRequirementId)
                .orElseThrow(() -> new NotFoundException(
                        "Club Report Requirement not found with ID: " + clubReportRequirementId));

        if (!clubReportRequirement.getClub().getId().equals(clubId)) {
            throw new ForbiddenException(
                    "Club Report Requirement does not belong to the specified club");
        }

        // Validate team exists and belongs to the club
        Team team = teamRepository.findByIdAndClubId(teamId, clubId)
                .orElseThrow(() -> new NotFoundException(
                        "Team not found with ID: " + teamId + " in club: " + clubId));

        // Get submission report requirement and check deadline
        if (clubReportRequirement.getSubmissionReportRequirement() != null) {
            SubmissionReportRequirement reportRequirement = clubReportRequirement.getSubmissionReportRequirement();
            validateDeadlineForAction(reportRequirement, clubReportRequirement.getReport(), "gán phòng ban cho báo cáo");
        }

        // Check if a report already exists for this requirement
        if (clubReportRequirement.getReport() != null) {
            throw new ForbiddenException(
                    "Không thể gán team cho yêu cầu báo cáo đã có báo cáo được tạo. " +
                    "Vui lòng xóa báo cáo trước khi gán lại team.");
        }

        // Update teamId
        clubReportRequirement.setTeamId(teamId);
        ClubReportRequirement savedClubReportRequirement = clubReportRequirementRepository.save(clubReportRequirement);

        log.info("Club officer {} assigned team {} to report requirement {} for club {}",
                userId, teamId, clubReportRequirementId, clubId);

        // Send notification to team members about the new assignment
        try {
            List<Long> teamMemberIds = getTeamOfficersInCurrentSemester(teamId, clubId);

            if (!teamMemberIds.isEmpty()) {
                SubmissionReportRequirement reportRequirement = savedClubReportRequirement.getSubmissionReportRequirement();
                String requirementTitle = reportRequirement != null ? reportRequirement.getTitle() : "Yêu cầu báo cáo";
                String actionUrl = "/report-requirements/" + (reportRequirement != null ? reportRequirement.getId() : clubReportRequirementId);

                String title = "Ban của bạn được phân công báo cáo mới";
                String message = "Ban " + team.getTeamName() + " đã được phân công chịu trách nhiệm cho yêu cầu báo cáo: \"" + requirementTitle + "\"";

                if (reportRequirement != null && reportRequirement.getDueDate() != null) {
                    message += ". Hạn nộp: " + reportRequirement.getDueDate();
                }

                notificationService.sendToUsers(
                        teamMemberIds,
                        userId,
                        title,
                        message,
                        NotificationType.TEAM_ASSIGNMENT,
                        NotificationPriority.HIGH,
                        actionUrl,
                        clubId,
                        null,
                        teamId,
                        null
                );
            }
        } catch (Exception e) {
            log.error("Failed to send team assignment notification: {}", e.getMessage());
        }

        // Build response
        ReportRequirementResponse response = submissionReportRequirementMapper.toDto(
                savedClubReportRequirement.getSubmissionReportRequirement());

        // Get status from report if exists, otherwise null
        String statusStr = null;
        if (savedClubReportRequirement.getReport() != null && 
            savedClubReportRequirement.getReport().getStatus() != null) {
            statusStr = savedClubReportRequirement.getReport().getStatus().name();
        }

        // Build club requirement info
        ReportRequirementResponse.ClubRequirementInfo clubRequirementInfo = 
                ReportRequirementResponse.ClubRequirementInfo.builder()
                        .id(savedClubReportRequirement.getId())
                        .clubId(savedClubReportRequirement.getClub().getId())
                        .clubName(savedClubReportRequirement.getClub().getClubName())
                        .clubCode(savedClubReportRequirement.getClub().getClubCode())
                        .status(statusStr)
                        .teamId(savedClubReportRequirement.getTeamId())
                        .build();

        response.setClubRequirements(List.of(clubRequirementInfo));
        return response;
    }

    /**
     * Get list of Club Officer user IDs in current semester for a specific club
     * @param clubId Club ID
     * @return List of user IDs who are Club Officers
     */
    private List<Long> getClubOfficersInCurrentSemester(Long clubId) {
        Semester currentSemester = semesterRepository.findByIsCurrentTrue()
                .orElse(null);

        if (currentSemester == null) {
            return Collections.emptyList();
        }

        return roleMemberShipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(
                clubId, currentSemester.getId());
    }

    /**
     * Get list of team member user IDs in current semester
     * @param teamId Team ID
     * @param clubId Club ID
     * @return List of user IDs who are team members
     */
    private List<Long> getTeamOfficersInCurrentSemester(Long teamId, Long clubId) {
        Semester currentSemester = semesterRepository.findByIsCurrentTrue()
                .orElse(null);

        if (currentSemester == null) {
            return Collections.emptyList();
        }

        // Get all role memberships for the team in current semester
        return roleMemberShipRepository.findTeamOfficerUserIdsByClubIdAndSemesterId(teamId, currentSemester.getId());
    }

    /**
     * Get list of Staff user IDs
     * @return List of user IDs who are Staff
     */
    private List<Long> getStaffUsers() {
        List<User> staffUsers = userRepository.findBySystemRole_RoleNameIgnoreCase("STAFF");
        return staffUsers.stream()
                .map(User::getId)
                .collect(Collectors.toList());
    }

    /**
     * Helper method to check if a report requirement is past due date
     * Returns true if the due date has passed and report is not in mustResubmit mode
     */
    private void validateDeadlineForAction(SubmissionReportRequirement reportRequirement, Report report, String action) {
        // Skip deadline check if report exists and mustResubmit is true
        if (report != null && report.isMustResubmit()) {
            return;
        }

        LocalDate dueDate = reportRequirement.getDueDate();
        if (dueDate != null && LocalDate.now().isAfter(dueDate)) {
            throw new ForbiddenException(
                    "Không thể " + action + " vì yêu cầu báo cáo đã quá hạn (" + dueDate + "). " +
                    "Vui lòng liên hệ nhà trường để được hỗ trợ."
            );
        }
    }

    private String normalizeVietnamese(String text) {
        if (text == null || text.isBlank()) return "";
        String normalized = text.replace("đ", "d").replace("Đ", "d");
        normalized = java.text.Normalizer.normalize(normalized, java.text.Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.toLowerCase();
    }
}

