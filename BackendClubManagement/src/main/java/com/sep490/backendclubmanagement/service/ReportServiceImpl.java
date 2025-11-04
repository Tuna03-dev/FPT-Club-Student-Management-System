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
import com.sep490.backendclubmanagement.entity.Club;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportServiceInterface {

    private final ReportRepository reportRepository;
    private final ClubReportRequirementRepository clubReportRequirementRepository;
    private final SubmissionReportRequirementRepository submissionReportRequirementRepository;
    private final ClubRepository clubRepository;
    private final EventRepository eventRepository;
    private final RoleService roleService;
    private final ReportMapper reportMapper;
    private final SubmissionReportRequirementMapper submissionReportRequirementMapper;
    private final RoleMemberShipRepository roleMemberShipRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;

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
    public ReportRequirementResponse createReportRequirement(CreateReportRequirementRequest request, Long userId) {
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

        // Create SubmissionReportRequirement
        SubmissionReportRequirement submissionRequirement = SubmissionReportRequirement.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .reportType(request.getReportType())
                .templateUrl(request.getTemplateUrl())
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
                    .status(ClubReportRequirementStatus.PENDING)
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

        // Determine status based on role
        ReportStatus status;
        if (isClubPresident) {
            // Club president can create and submit directly
            status = ReportStatus.SUBMITTED;
        } else {
            // Team officer can only create draft
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

        log.info("User {} created report {} with status {} for club {}", userId, savedReport.getId(), status, request.getClubId());

        return reportMapper.toDetail(reportRepository.findByIdWithRelations(savedReport.getId())
                .orElse(savedReport));
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
}

