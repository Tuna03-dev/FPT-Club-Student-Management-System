package com.sep490.backendclubmanagement.service;

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
import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
import com.sep490.backendclubmanagement.entity.ClubReportRequirement;
import com.sep490.backendclubmanagement.entity.ClubReportRequirementStatus;
import com.sep490.backendclubmanagement.entity.Event;
import com.sep490.backendclubmanagement.entity.Report;
import com.sep490.backendclubmanagement.entity.ReportStatus;
import com.sep490.backendclubmanagement.entity.SubmissionReportRequirement;
import com.sep490.backendclubmanagement.exception.ForbiddenException;
import com.sep490.backendclubmanagement.exception.NotFoundException;
import com.sep490.backendclubmanagement.mapper.ReportMapper;
import com.sep490.backendclubmanagement.mapper.SubmissionReportRequirementMapper;
import com.sep490.backendclubmanagement.entity.Semester;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.ClubReportRequirementRepository;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.EventRepository;
import com.sep490.backendclubmanagement.repository.ReportRepository;
import com.sep490.backendclubmanagement.repository.RoleMemberShipRepository;
import com.sep490.backendclubmanagement.repository.SemesterRepository;
import com.sep490.backendclubmanagement.repository.SubmissionReportRequirementRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
                    .status(ClubReportRequirementStatus.UNSUBMITTED)
                    .note(null)
                    .build();

            ClubReportRequirement savedClubRequirement = clubReportRequirementRepository.save(clubRequirement);

            clubRequirementInfos.add(ReportRequirementResponse.ClubRequirementInfo.builder()
                    .id(savedClubRequirement.getId())
                    .clubId(club.getId())
                    .clubName(club.getClubName())
                    .clubCode(club.getClubCode())
                    .status(savedClubRequirement.getStatus().name())
                    .note(savedClubRequirement.getNote())
                    .build());
        }

        log.info("Staff {} has created report requirement {} for {} clubs", userId, savedSubmissionRequirement.getId(), clubs.size());

        // Map SubmissionReportRequirement to response using mapper
        ReportRequirementResponse response = submissionReportRequirementMapper.toDto(savedSubmissionRequirement);
        
        // Set clubRequirements (not mapped by mapper as it comes from ClubReportRequirement)
        response.setClubRequirements(clubRequirementInfos);

        return response;
    }

    /**
     * Create a report (draft for team officer, can submit for club president)
     * If autoSubmit is true and user is club president, the report will be automatically submitted
     */
    @Override
    @Transactional
    public ReportDetailResponse createReport(CreateReportRequest request, Long userId) {
        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new NotFoundException("Current semester not found"));

        // Validate club exists
        Club club = clubRepository.findById(request.getClubId())
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + request.getClubId()));

        // Validate report requirement exists
        SubmissionReportRequirement reportRequirement = submissionReportRequirementRepository.findById(request.getReportRequirementId())
                .orElseThrow(() -> new NotFoundException("Report requirement not found with ID: " + request.getReportRequirementId()));

        // Get user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found with ID: " + userId));

        // Check if user is team officer or club president in current semester and active
        boolean isTeamOfficer = roleMemberShipRepository.isTeamOfficerInCurrentSemester(
                userId, request.getClubId(), currentSemester.getId());
        boolean isClubPresident = roleMemberShipRepository.isClubPresidentInCurrentSemester(
                userId, request.getClubId(), currentSemester.getId());

        if (!isTeamOfficer && !isClubPresident) {
            throw new ForbiddenException(
                    "Chỉ cán bộ ban (team officer) hoặc chủ nhiệm câu lạc bộ (club president) " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền tạo báo cáo."
            );
        }

        // Determine status based on role and autoSubmit flag
        ReportStatus status;
        boolean shouldAutoSubmit = false;
        
        if (isClubPresident) {
            // Club president: if autoSubmit is true or null (default), create and submit directly
            // If autoSubmit is false, create as draft
            if (request.getAutoSubmit() == null || Boolean.TRUE.equals(request.getAutoSubmit())) {
                status = ReportStatus.SUBMITTED;
                shouldAutoSubmit = true;
            } else {
                status = ReportStatus.DRAFT;
            }
        } else {
            // Team officer: always create draft (ignore autoSubmit flag)
            status = ReportStatus.DRAFT;
        }

        // Create report
        Report report = Report.builder()
                .reportTitle(request.getReportTitle())
                .content(request.getContent())
                .fileUrl(request.getFileUrl())
                .status(status)
                .club(club)
                .semester(currentSemester)
                .createdBy(user)
                .reportRequirement(reportRequirement)
                .build();

        if (status == ReportStatus.SUBMITTED) {
            report.setSubmittedDate(LocalDateTime.now());
        }

        Report savedReport = reportRepository.save(report);

        log.info("User {} created report {} with status {} for club {} (autoSubmit: {})", 
                userId, savedReport.getId(), status, request.getClubId(), shouldAutoSubmit);

        // If autoSubmit is true and report was created as SUBMITTED, the report is already submitted
        // No need to call submitReport separately as it's already in SUBMITTED status

        return reportMapper.toDetail(reportRepository.findByIdWithRelations(savedReport.getId())
                .orElse(savedReport));
    }

    /**
     * Create a report with file upload (draft for team officer, can submit for club president)
     * If autoSubmit is true and user is club president, the report will be automatically submitted
     */
    @Override
    @Transactional
    public ReportDetailResponse createReportWithFile(CreateReportRequest request, MultipartFile file, Long userId) {
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
     * Update a draft report
     */
    @Override
    @Transactional
    public ReportDetailResponse updateReport(Long reportId, UpdateReportRequest request, Long userId) {
        // Get report with relations
        Report report = reportRepository.findByIdWithRelations(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + reportId));

        // Only allow updating draft reports
        if (report.getStatus() != ReportStatus.DRAFT) {
            throw new ForbiddenException("Chỉ có thể cập nhật báo cáo ở trạng thái nháp (DRAFT)");
        }

        // Check if user is the creator or club president
        boolean isCreator = report.getCreatedBy() != null && report.getCreatedBy().getId().equals(userId);
        
        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new NotFoundException("Current semester not found"));

        boolean isClubPresident = false;
        if (report.getClub() != null) {
            isClubPresident = roleMemberShipRepository.isClubPresidentInCurrentSemester(
                    userId, report.getClub().getId(), currentSemester.getId());
        }

        if (!isCreator && !isClubPresident) {
            throw new ForbiddenException("Bạn không có quyền cập nhật báo cáo này");
        }

        // Update report
        report.setReportTitle(request.getReportTitle());
        report.setContent(request.getContent());
        report.setFileUrl(request.getFileUrl());

        Report updatedReport = reportRepository.save(report);

        log.info("User {} updated report {}", userId, reportId);

        return reportMapper.toDetail(updatedReport);
    }

    /**
     * Submit a draft report (club president only)
     */
    @Override
    @Transactional
    public ReportDetailResponse submitReport(SubmitReportRequest request, Long userId) {
        // Get report with relations
        Report report = reportRepository.findByIdWithRelations(request.getReportId())
                .orElseThrow(() -> new NotFoundException("Report not found with ID: " + request.getReportId()));

        // Only allow submitting draft reports
        if (report.getStatus() != ReportStatus.DRAFT) {
            throw new ForbiddenException("Chỉ có thể nộp báo cáo ở trạng thái nháp (DRAFT). Trạng thái hiện tại: " + report.getStatus());
        }

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new NotFoundException("Current semester not found"));

        // Check if user is club president in current semester and active
        if (report.getClub() == null) {
            throw new NotFoundException("Report must have an associated club");
        }

        boolean isClubPresident = roleMemberShipRepository.isClubPresidentInCurrentSemester(
                userId, report.getClub().getId(), currentSemester.getId());

        if (!isClubPresident) {
            throw new ForbiddenException(
                    "Chỉ chủ nhiệm câu lạc bộ (club president) trong kỳ hiện tại và đang hoạt động " +
                    "mới có quyền nộp báo cáo."
            );
        }

        // Update report status to SUBMITTED
        report.setStatus(ReportStatus.SUBMITTED);
        report.setSubmittedDate(LocalDateTime.now());

        Report submittedReport = reportRepository.save(report);

        log.info("Club president {} submitted report {}", userId, request.getReportId());

        return reportMapper.toDetail(submittedReport);
    }

    /**
     * Get all reports for a club (club president can see all, team officer can see their own)
     */
    @Override
    public List<ReportListItemResponse> getClubReports(Long clubId, Long userId) {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElse(null);

        // Check if user is club president or team officer
        boolean isClubPresident = false;
        boolean isTeamOfficer = false;

        if (currentSemester != null) {
            isClubPresident = roleMemberShipRepository.isClubPresidentInCurrentSemester(
                    userId, clubId, currentSemester.getId());
            isTeamOfficer = roleMemberShipRepository.isTeamOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        if (!isClubPresident && !isTeamOfficer) {
            throw new ForbiddenException(
                    "Chỉ cán bộ ban (team officer) hoặc chủ nhiệm câu lạc bộ (club president) " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền xem báo cáo."
            );
        }

        List<Report> reports;
        if (isClubPresident) {
            // Club president can see all reports
            reports = reportRepository.findByClubIdAndStatus(clubId, null);
        } else {
            // Team officer can only see their own reports
            reports = reportRepository.findByClubIdAndUserIdAndStatus(clubId, userId, null);
        }

        return reports.stream()
                .map(reportMapper::toListItem)
                .toList();
    }

    /**
     * Get my draft reports for a club
     */
    @Override
    public List<ReportListItemResponse> getMyDraftReports(Long clubId, Long userId) {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElse(null);

        // Check if user is team officer or club president
        boolean isClubPresident = false;
        boolean isTeamOfficer = false;

        if (currentSemester != null) {
            isClubPresident = roleMemberShipRepository.isClubPresidentInCurrentSemester(
                    userId, clubId, currentSemester.getId());
            isTeamOfficer = roleMemberShipRepository.isTeamOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        if (!isClubPresident && !isTeamOfficer) {
            throw new ForbiddenException(
                    "Chỉ cán bộ ban (team officer) hoặc chủ nhiệm câu lạc bộ (club president) " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền xem báo cáo nháp."
            );
        }

        // Get draft reports for the user
        List<Report> draftReports = reportRepository.findByClubIdAndUserIdAndStatus(
                clubId, userId, ReportStatus.DRAFT);

        return draftReports.stream()
                .map(reportMapper::toListItem)
                .toList();
    }

    /**
     * Get all report requirements with filters and pagination (for staff only)
     */
    @Override
    public PageResponse<ReportRequirementResponse> getAllReportRequirements(
            ReportRequirementFilterRequest request,
            Long userId
    ) {
        // Check staff permission
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Only staff can view report requirements");
        }

        Pageable pageable = request.getPageable("createdAt,desc");
        
        Page<SubmissionReportRequirement> requirementPage = submissionReportRequirementRepository.findAllWithFilters(
                request.getReportType(),
                request.getClubId(),
                request.getKeyword(),
                pageable
        );

        // Map to response with club requirements
        Page<ReportRequirementResponse> responsePage = requirementPage.map(requirement -> {
            ReportRequirementResponse response = submissionReportRequirementMapper.toDto(requirement);
            
            // Load club requirements for this submission requirement
            List<ClubReportRequirement> clubRequirements = clubReportRequirementRepository
                    .findBySubmissionReportRequirementId(requirement.getId());
            
            List<ReportRequirementResponse.ClubRequirementInfo> clubRequirementInfos = clubRequirements.stream()
                    .map(crr -> ReportRequirementResponse.ClubRequirementInfo.builder()
                            .id(crr.getId())
                            .clubId(crr.getClub().getId())
                            .clubName(crr.getClub().getClubName())
                            .clubCode(crr.getClub().getClubCode())
                            .status(crr.getStatus().name())
                            .note(crr.getNote())
                            .build())
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
                .map(crr -> ReportRequirementResponse.ClubRequirementInfo.builder()
                        .id(crr.getId())
                        .clubId(crr.getClub().getId())
                        .clubName(crr.getClub().getClubName())
                        .clubCode(crr.getClub().getClubCode())
                        .status(crr.getStatus().name())
                        .note(crr.getNote())
                        .build())
                .toList();
    }

    /**
     * Get report of a specific club for a specific report requirement (for staff only)
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
        return reportMapper.toDetail(report);
    }

    /**
     * Get all report requirements for a club (for club members)
     */
    @Override
    public List<ReportRequirementResponse> getClubReportRequirements(Long clubId, Long userId) {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Check if user is a member of this club - use existsByUserIdAndClubIdAndStatus
        if (!clubMemberShipRepository.existsByUserIdAndClubIdAndStatus(userId, clubId, ClubMemberShipStatus.ACTIVE)) {
            throw new ForbiddenException("You are not a member of this club");
        }

        // Get all club report requirements for this club
        List<ClubReportRequirement> clubRequirements = clubReportRequirementRepository.findByClubId(clubId);

        // Map to response
        return clubRequirements.stream()
                .map(crr -> {
                    ReportRequirementResponse response = submissionReportRequirementMapper.toDto(crr.getSubmissionReportRequirement());
                    
                    // Add the club requirement info for this specific club
                    ReportRequirementResponse.ClubRequirementInfo clubRequirementInfo = ReportRequirementResponse.ClubRequirementInfo.builder()
                            .id(crr.getId())
                            .clubId(crr.getClub().getId())
                            .clubName(crr.getClub().getClubName())
                            .clubCode(crr.getClub().getClubCode())
                            .status(crr.getStatus().name())
                            .note(crr.getNote())
                            .build();
                    
                    response.setClubRequirements(List.of(clubRequirementInfo));
                    return response;
                })
                .toList();
    }

    /**
     * Get all report requirements for a club (for CLUB_OFFICER or TEAM_OFFICER)
     */
    @Override
    public List<ReportRequirementResponse> getClubReportRequirementsForOfficer(Long clubId, Long userId) {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));

        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElse(null);

        // Check if user is CLUB_OFFICER (system role) or TEAM_OFFICER (in current semester)
        boolean isClubOfficer = roleService.isClubOfficer(userId);
        boolean isTeamOfficer = false;

        if (currentSemester != null) {
            isTeamOfficer = roleMemberShipRepository.isTeamOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        if (!isClubOfficer && !isTeamOfficer) {
            throw new ForbiddenException(
                    "Chỉ cán bộ câu lạc bộ (CLUB_OFFICER) hoặc cán bộ ban (TEAM_OFFICER) " +
                    "trong kỳ hiện tại và đang hoạt động mới có quyền xem danh sách yêu cầu báo cáo."
            );
        }

        // Get all club report requirements for this club
        List<ClubReportRequirement> clubRequirements = clubReportRequirementRepository.findByClubId(clubId);

        // Map to response
        return clubRequirements.stream()
                .map(crr -> {
                    ReportRequirementResponse response = submissionReportRequirementMapper.toDto(crr.getSubmissionReportRequirement());
                    
                    // Add the club requirement info for this specific club
                    ReportRequirementResponse.ClubRequirementInfo clubRequirementInfo = ReportRequirementResponse.ClubRequirementInfo.builder()
                            .id(crr.getId())
                            .clubId(crr.getClub().getId())
                            .clubName(crr.getClub().getClubName())
                            .clubCode(crr.getClub().getClubCode())
                            .status(crr.getStatus().name())
                            .note(crr.getNote())
                            .build();
                    
                    response.setClubRequirements(List.of(clubRequirementInfo));
                    return response;
                })
                .toList();
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

        // Check if user is CLUB_OFFICER (system role) or TEAM_OFFICER (in current semester)
        boolean isClubOfficer = roleService.isClubOfficer(userId);
        boolean isTeamOfficer = false;

        if (currentSemester != null) {
            isTeamOfficer = roleMemberShipRepository.isTeamOfficerInCurrentSemester(
                    userId, clubId, currentSemester.getId());
        }

        if (!isClubOfficer && !isTeamOfficer) {
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
}

