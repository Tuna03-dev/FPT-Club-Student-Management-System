package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.request.*;
import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ForbiddenException;
import com.sep490.backendclubmanagement.exception.NotFoundException;
import com.sep490.backendclubmanagement.mapper.ReportMapper;
import com.sep490.backendclubmanagement.mapper.SubmissionReportRequirementMapper;
import com.sep490.backendclubmanagement.repository.*;
import com.sep490.backendclubmanagement.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.springframework.data.domain.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class ReportServiceImplTest {

    @Mock
    private ReportRepository reportRepository;
    @Mock
    private ClubReportRequirementRepository clubReportRequirementRepository;
    @Mock
    private SubmissionReportRequirementRepository submissionReportRequirementRepository;
    @Mock
    private ClubRepository clubRepository;
    @Mock
    private ClubMemberShipRepository clubMemberShipRepository;
    @Mock
    private EventRepository eventRepository;
    @Mock
    private RoleService roleService;
    @Mock
    private ReportMapper reportMapper;
    @Mock
    private SubmissionReportRequirementMapper submissionReportRequirementMapper;
    @Mock
    private SemesterRepository semesterRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CloudinaryService cloudinaryService;
    @Mock
    private RoleMemberShipRepository roleMemberShipRepository;

    @InjectMocks
    private ReportServiceImpl reportService;

    private Club club;
    private User user;
    private User staffUser;
    private Semester currentSemester;
    private Report report;
    private SubmissionReportRequirement submissionRequirement;
    private ClubReportRequirement clubRequirement;
    private Event event;

    @BeforeEach
    void setup() {
        club = new Club();
        club.setId(1L);
        club.setClubName("Test Club");
        club.setClubCode("TC001");
        club.setStatus("ACTIVE");

        user = new User();
        user.setId(10L);
        user.setFullName("Nguyen Van A");
        user.setStudentCode("SE001");
        user.setEmail("user@test.com");

        staffUser = new User();
        staffUser.setId(20L);
        staffUser.setFullName("Staff User");
        staffUser.setEmail("staff@test.com");

        currentSemester = new Semester();
        currentSemester.setId(5L);
        currentSemester.setSemesterCode("2024A");
        currentSemester.setIsCurrent(true);
        currentSemester.setStartDate(LocalDate.of(2024, 1, 1));
        currentSemester.setEndDate(LocalDate.of(2024, 6, 30));

        event = new Event();
        event.setId(100L);
        event.setTitle("Test Event");

        submissionRequirement = new SubmissionReportRequirement();
        submissionRequirement.setId(1L);
        submissionRequirement.setTitle("Semester Report");
        submissionRequirement.setDescription("Semester report requirement");
        submissionRequirement.setReportType(ReportType.SEMESTER);
        submissionRequirement.setDueDate(LocalDateTime.now().plusDays(7));
        submissionRequirement.setCreatedBy(staffUser);

        clubRequirement = new ClubReportRequirement();
        clubRequirement.setId(1L);
        clubRequirement.setClub(club);
        clubRequirement.setSubmissionReportRequirement(submissionRequirement);

        report = new Report();
        report.setId(1L);
        report.setReportTitle("Test Report");
        report.setContent("Test content");
        report.setStatus(ReportStatus.DRAFT);
        report.setClubReportRequirement(clubRequirement);
        report.setSemester(currentSemester);
        report.setCreatedBy(user);
    }

    // ========== getAllReports ==========

    @Test
    void getAllReports_Success_WhenStaffAccessWithFilters() {
        // Arrange
        Long staffId = staffUser.getId();
        Pageable pageable = PageRequest.of(0, 10);

        ClubReportRequirement universityClubReq = new ClubReportRequirement();
        universityClubReq.setId(2L);
        universityClubReq.setClub(club);
        universityClubReq.setSubmissionReportRequirement(submissionRequirement);

        Report universityReport = new Report();
        universityReport.setId(2L);
        universityReport.setReportTitle("University Report");
        universityReport.setStatus(ReportStatus.PENDING_UNIVERSITY);
        universityReport.setClubReportRequirement(universityClubReq);
        universityReport.setSemester(currentSemester);

        Page<Report> reportPage = new PageImpl<>(List.of(universityReport), pageable, 1);

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(reportRepository.findAllWithFilters(
            any(ReportStatus.class), any(Long.class), any(Long.class),
            any(ReportType.class), isNull(), any(Pageable.class)
        )).thenReturn(reportPage);

        ReportListItemResponse responseItem = new ReportListItemResponse();
        responseItem.setId(2L);
        responseItem.setReportTitle("University Report");
        when(reportMapper.toListItem(universityReport)).thenReturn(responseItem);

        // Act
        PageResponse<ReportListItemResponse> result = reportService.getAllReports(
            ReportStatus.PENDING_UNIVERSITY, club.getId(), currentSemester.getId(),
            ReportType.SEMESTER, null, pageable, staffId
        );

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("University Report", result.getContent().get(0).getReportTitle());
        verify(roleService).isStaff(staffId);
    }

    @Test
    void getAllReports_ThrowsForbiddenException_WhenNotStaff() {
        // Arrange
        Long userId = user.getId();
        Pageable pageable = PageRequest.of(0, 10);

        when(roleService.isStaff(userId)).thenReturn(false);

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.getAllReports(null, null, null, null, null, pageable, userId)
        );
        verify(roleService).isStaff(userId);
    }

    // ========== getReportDetail ==========

    @Test
    void getReportDetail_Success_WhenStaffAccess() {
        // Arrange
        Long staffId = staffUser.getId();
        Long reportId = report.getId();
        report.setStatus(ReportStatus.PENDING_UNIVERSITY);

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(reportRepository.findByIdWithRelations(reportId)).thenReturn(Optional.of(report));

        ReportDetailResponse detailResponse = new ReportDetailResponse();
        detailResponse.setId(reportId);
        detailResponse.setReportTitle("Test Report");
        when(reportMapper.toDetail(report)).thenReturn(detailResponse);

        // Act
        ReportDetailResponse result = reportService.getReportDetail(reportId, staffId);

        // Assert
        assertNotNull(result);
        assertEquals(reportId, result.getId());
        assertEquals("Test Report", result.getReportTitle());
        verify(reportRepository).findByIdWithRelations(reportId);
    }

    @Test
    void getReportDetail_ThrowsNotFoundException_WhenReportNotFound() {
        // Arrange
        Long staffId = staffUser.getId();
        Long reportId = 999L;

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(reportRepository.findByIdWithRelations(reportId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundException.class, () ->
            reportService.getReportDetail(reportId, staffId)
        );
    }

    // ========== reviewReport ==========


    @Test
    void reviewReport_ThrowsForbiddenException_WhenNotStaff() {
        // Arrange
        Long userId = user.getId();
        ReportReviewRequest request = new ReportReviewRequest();
        request.setReportId(report.getId());
        request.setStatus(ReportStatus.APPROVED_UNIVERSITY);

        when(roleService.isStaff(userId)).thenReturn(false);

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.reviewReport(request, userId)
        );
    }

    @Test
    void reviewReport_ThrowsForbiddenException_WhenInvalidStatusTransition() {
        // Arrange
        Long staffId = staffUser.getId();
        report.setStatus(ReportStatus.DRAFT);

        ReportReviewRequest request = new ReportReviewRequest();
        request.setReportId(report.getId());
        request.setStatus(ReportStatus.APPROVED_UNIVERSITY);

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.reviewReport(request, staffId)
        );
    }

    // ========== createReportRequirement ==========

    @Test
    void createReportRequirement_Success_WhenStaffCreatesForMultipleClubs() throws AppException {
        // Arrange
        Long staffId = staffUser.getId();

        CreateReportRequirementRequest request = new CreateReportRequirementRequest();
        request.setTitle("Monthly Report");
        request.setDescription("Submit monthly report");
        request.setReportType(ReportType.SEMESTER);
        request.setDueDate(LocalDateTime.now().plusDays(7));
        request.setClubIds(List.of(1L, 2L));

        Club club2 = new Club();
        club2.setId(2L);
        club2.setClubName("Test Club 2");
        club2.setClubCode("TC002");

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staffUser));
        when(submissionReportRequirementRepository.save(any(SubmissionReportRequirement.class)))
            .thenReturn(submissionRequirement);
        when(clubRepository.findAllById(request.getClubIds())).thenReturn(List.of(club, club2));
        when(clubReportRequirementRepository.save(any(ClubReportRequirement.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        ReportRequirementResponse response = new ReportRequirementResponse();
        response.setId(1L);
        response.setTitle("Monthly Report");
        when(submissionReportRequirementMapper.toDto(submissionRequirement)).thenReturn(response);

        // Act
        ReportRequirementResponse result = reportService.createReportRequirement(request, null, staffId);

        // Assert
        assertNotNull(result);
        assertEquals("Monthly Report", result.getTitle());
        verify(submissionReportRequirementRepository).save(any(SubmissionReportRequirement.class));
        verify(clubReportRequirementRepository, times(2)).save(any(ClubReportRequirement.class));
    }

    @Test
    void createReportRequirement_Success_WithEvent() throws AppException {
        // Arrange
        Long staffId = staffUser.getId();

        CreateReportRequirementRequest request = new CreateReportRequirementRequest();
        request.setTitle("Event Report");
        request.setDescription("Post-event report");
        request.setReportType(ReportType.EVENT);
        request.setDueDate(LocalDateTime.now().plusDays(7));
        request.setEventId(event.getId());
        request.setClubIds(List.of(1L));

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staffUser));
        when(eventRepository.findById(event.getId())).thenReturn(Optional.of(event));
        when(submissionReportRequirementRepository.save(any(SubmissionReportRequirement.class)))
            .thenReturn(submissionRequirement);
        when(clubRepository.findAllById(request.getClubIds())).thenReturn(List.of(club));
        when(clubReportRequirementRepository.save(any(ClubReportRequirement.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        ReportRequirementResponse response = new ReportRequirementResponse();
        response.setId(1L);
        response.setTitle("Event Report");
        when(submissionReportRequirementMapper.toDto(submissionRequirement)).thenReturn(response);

        // Act
        ReportRequirementResponse result = reportService.createReportRequirement(request, null, staffId);

        // Assert
        assertNotNull(result);
        assertEquals("Event Report", result.getTitle());
        verify(eventRepository).findById(event.getId());
    }

    @Test
    void createReportRequirement_ThrowsException_WhenDueDateInPast() {
        // Arrange
        Long staffId = staffUser.getId();

        CreateReportRequirementRequest request = new CreateReportRequirementRequest();
        request.setTitle("Monthly Report");
        request.setDueDate(LocalDateTime.now().minusDays(1));
        request.setClubIds(List.of(1L));

        when(roleService.isStaff(staffId)).thenReturn(true);

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () ->
            reportService.createReportRequirement(request, null, staffId)
        );
    }

    @Test
    void createReportRequirement_WithFile_UploadsSuccessfully() throws AppException {
        // Arrange
        Long staffId = staffUser.getId();
        MultipartFile file = mock(MultipartFile.class);

        CreateReportRequirementRequest request = new CreateReportRequirementRequest();
        request.setTitle("Monthly Report");
        request.setDescription("Submit monthly report");
        request.setReportType(ReportType.SEMESTER);
        request.setDueDate(LocalDateTime.now().plusDays(7));
        request.setClubIds(List.of(1L));

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(1024L * 1024L); // 1MB
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staffUser));

        CloudinaryService.UploadResult uploadResult = new CloudinaryService.UploadResult(
            "http://cloudinary.com/template.pdf", "template_id", "pdf", 1024L
        );
        when(cloudinaryService.uploadFile(file)).thenReturn(uploadResult);

        when(submissionReportRequirementRepository.save(any(SubmissionReportRequirement.class)))
            .thenReturn(submissionRequirement);
        when(clubRepository.findAllById(request.getClubIds())).thenReturn(List.of(club));
        when(clubReportRequirementRepository.save(any(ClubReportRequirement.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        ReportRequirementResponse response = new ReportRequirementResponse();
        response.setId(1L);
        when(submissionReportRequirementMapper.toDto(submissionRequirement)).thenReturn(response);

        // Act
        ReportRequirementResponse result = reportService.createReportRequirement(request, file, staffId);

        // Assert
        assertNotNull(result);
        verify(cloudinaryService).uploadFile(file);
        verify(submissionReportRequirementRepository).save(argThat(req ->
            req.getTemplateUrl().equals("http://cloudinary.com/template.pdf")
        ));
    }

    @Test
    void createReportRequirement_ThrowsException_WhenFileTooLarge() {
        // Arrange
        Long staffId = staffUser.getId();
        MultipartFile file = mock(MultipartFile.class);

        CreateReportRequirementRequest request = new CreateReportRequirementRequest();
        request.setTitle("Monthly Report");
        request.setDueDate(LocalDateTime.now().plusDays(7));
        request.setClubIds(List.of(1L));

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(25L * 1024L * 1024L); // 25MB - exceeds limit

        // Act & Assert
        assertThrows(AppException.class, () ->
            reportService.createReportRequirement(request, file, staffId)
        );
    }

    // ========== updateReportRequirement ==========

    @Test
    void updateReportRequirement_Success_WhenStaffUpdates() throws AppException {
        // Arrange
        Long staffId = staffUser.getId();
        Long requirementId = submissionRequirement.getId();

        UpdateReportRequirementRequest request = new UpdateReportRequirementRequest();
        request.setTitle("Updated Monthly Report");
        request.setDescription("Updated description");
        request.setDueDate(LocalDateTime.now().plusDays(10));

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(submissionReportRequirementRepository.findById(requirementId))
            .thenReturn(Optional.of(submissionRequirement));
        when(submissionReportRequirementRepository.save(any(SubmissionReportRequirement.class)))
            .thenReturn(submissionRequirement);

        ReportRequirementResponse response = new ReportRequirementResponse();
        response.setId(requirementId);
        response.setTitle("Updated Monthly Report");
        when(submissionReportRequirementMapper.toDto(submissionRequirement)).thenReturn(response);

        // Act
        ReportRequirementResponse result = reportService.updateReportRequirement(requirementId, request, null, staffId);

        // Assert
        assertNotNull(result);
        assertEquals("Updated Monthly Report", result.getTitle());
        verify(submissionReportRequirementRepository).save(any(SubmissionReportRequirement.class));
    }

    // ========== createReport ==========

    @Test
    void createReport_Success_WhenClubOfficerCreates() throws AppException {
        // Arrange
        Long userId = user.getId();

        CreateReportRequest request = new CreateReportRequest();
        request.setClubId(club.getId());
        request.setReportTitle("New Report");
        request.setContent("Report content");
        request.setReportRequirementId(clubRequirement.getId());
        request.setAutoSubmit(true);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleMemberShipRepository.isClubOfficerOrTeamOfficerOrTreasurerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(submissionReportRequirementRepository.findById(clubRequirement.getId()))
            .thenReturn(Optional.of(submissionRequirement));
        when(clubReportRequirementRepository.findByClubIdAndSubmissionReportRequirementId(
            club.getId(), clubRequirement.getId()
        )).thenReturn(Optional.of(clubRequirement));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(reportRepository.save(any(Report.class))).thenReturn(report);
        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(1L);
        response.setReportTitle("New Report");
        when(reportMapper.toDetail(report)).thenReturn(response);

        // Act
        ReportDetailResponse result = reportService.createReport(request, null, userId);

        // Assert
        assertNotNull(result);
        assertEquals("New Report", result.getReportTitle());
        verify(reportRepository).save(any(Report.class));
    }

    @Test
    void createReport_ThrowsForbiddenException_WhenNotClubOfficer() {
        // Arrange
        Long userId = user.getId();

        CreateReportRequest request = new CreateReportRequest();
        request.setClubId(club.getId());
        request.setReportTitle("New Report");
        request.setReportRequirementId(clubRequirement.getId());

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleMemberShipRepository.isClubOfficerOrTeamOfficerOrTreasurerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(false);

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.createReport(request, null, userId)
        );
    }

    // ========== updateReport ==========

    @Test
    void updateReport_Success_WhenCreatorUpdates() throws AppException {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.DRAFT);

        UpdateReportRequest request = new UpdateReportRequest();
        request.setReportTitle("Updated Report");
        request.setContent("Updated content");

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenReturn(report);

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(report.getId());
        response.setReportTitle("Updated Report");
        when(reportMapper.toDetail(report)).thenReturn(response);

        // Act
        ReportDetailResponse result = reportService.updateReport(report.getId(), request, null, userId);

        // Assert
        assertNotNull(result);
        assertEquals("Updated Report", result.getReportTitle());
        verify(reportRepository).save(any(Report.class));
    }

    @Test
    void updateReport_ThrowsForbiddenException_WhenNotCreator() {
        // Arrange
        Long otherUserId = 999L;
        report.setStatus(ReportStatus.DRAFT);

        UpdateReportRequest request = new UpdateReportRequest();
        request.setReportTitle("Updated Report");

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.updateReport(report.getId(), request, null, otherUserId)
        );
    }

    // ========== submitReport ==========

    @Test
    void submitReport_Success_WhenReportInDraftStatus() throws AppException {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.DRAFT);

        SubmitReportRequest request = new SubmitReportRequest();
        request.setReportId(report.getId());

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(reportRepository.save(any(Report.class))).thenReturn(report);

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(report.getId());
        response.setStatus(ReportStatus.PENDING_CLUB);
        when(reportMapper.toDetail(report)).thenReturn(response);

        // Act
        ReportDetailResponse result = reportService.submitReport(request, userId);

        // Assert
        assertNotNull(result);
        assertEquals(ReportStatus.PENDING_CLUB, result.getStatus());
        verify(reportRepository).save(argThat(r ->
            r.getStatus() == ReportStatus.PENDING_CLUB && r.getSubmittedDate() != null
        ));
    }

    @Test
    void submitReport_Success_WhenResubmittingRejectedReport() throws AppException {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.REJECTED_CLUB);
        report.setMustResubmit(true);

        SubmitReportRequest request = new SubmitReportRequest();
        request.setReportId(report.getId());

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(reportRepository.save(any(Report.class))).thenReturn(report);

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(report.getId());
        response.setStatus(ReportStatus.UPDATED_PENDING_CLUB);
        when(reportMapper.toDetail(report)).thenReturn(response);

        // Act
        ReportDetailResponse result = reportService.submitReport(request, userId);

        // Assert
        assertNotNull(result);
        verify(reportRepository).save(argThat(r ->
            r.getStatus() == ReportStatus.UPDATED_PENDING_CLUB
        ));
    }


    // ========== getClubReports ==========

    @Test
    void getClubReports_Success_WhenClubOfficerAccess() {
        // Arrange
        Long userId = user.getId();
        Pageable pageable = PageRequest.of(0, 10);
        report.setStatus(ReportStatus.PENDING_CLUB);

        Page<Report> reportPage = new PageImpl<>(List.of(report), pageable, 1);

        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(reportRepository.findByClubIdWithFilter(
            any(), eq(club.getId()), any(), any(), any(), eq(pageable)
        )).thenReturn(reportPage);

        ReportListItemResponse responseItem = new ReportListItemResponse();
        responseItem.setId(report.getId());
        responseItem.setReportTitle("Test Report");
        when(reportMapper.toListItem(report)).thenReturn(responseItem);

        // Act
        PageResponse<ReportListItemResponse> result = reportService.getClubReports(
            club.getId(), null, null, null, null, pageable, userId
        );

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Test Report", result.getContent().get(0).getReportTitle());
    }

    @Test
    void getClubReports_ThrowsForbiddenException_WhenNotClubOfficer() {
        // Arrange
        Long userId = user.getId();
        Pageable pageable = PageRequest.of(0, 10);

        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(false);

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.getClubReports(club.getId(), null, null, null, null, pageable, userId)
        );
    }

    // ========== deleteReport ==========

    @Test
    void deleteReport_Success_WhenReportInDraftStatus() throws AppException {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.DRAFT);

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(clubReportRequirementRepository.save(any(ClubReportRequirement.class)))
            .thenReturn(clubRequirement);

        // Act
        reportService.deleteReport(report.getId(), userId);

        // Assert
        verify(clubReportRequirementRepository).save(argThat(crr -> crr.getReport() == null));
        verify(reportRepository).delete(report);
        verify(reportRepository).flush();
    }

    @Test
    void deleteReport_ThrowsException_WhenReportNotInDraft() {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.PENDING_UNIVERSITY);

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.deleteReport(report.getId(), userId)
        );
    }

    // ========== getAllReportRequirements ==========

    @Test
    void getAllReportRequirements_Success_WhenStaffAccess() {
        // Arrange
        Long staffId = staffUser.getId();
        Pageable pageable = PageRequest.of(0, 10);

        Page<SubmissionReportRequirement> requirementPage =
            new PageImpl<>(List.of(submissionRequirement), pageable, 1);

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(submissionReportRequirementRepository.findAllWithFilters(
            any(), any(), any(), eq(pageable)
        )).thenReturn(requirementPage);

        ReportRequirementResponse response = new ReportRequirementResponse();
        response.setId(1L);
        response.setTitle("Monthly Report");
        when(submissionReportRequirementMapper.toDto(submissionRequirement)).thenReturn(response);

        // Act
        PageResponse<ReportRequirementResponse> result = reportService.getAllReportRequirements(
            null, null, null, pageable, staffId
        );

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Monthly Report", result.getContent().get(0).getTitle());
    }

    // ========== reviewReportByClub ==========

    @Test
    void reviewReportByClub_Success_WhenClubOfficerApproves() throws AppException {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.PENDING_CLUB);

        ReportReviewRequest request = new ReportReviewRequest();
        request.setReportId(report.getId());
        request.setStatus(ReportStatus.PENDING_UNIVERSITY);
        request.setReviewerFeedback("Approved by club");

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(reportRepository.save(any(Report.class))).thenReturn(report);

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(report.getId());
        response.setStatus(ReportStatus.PENDING_UNIVERSITY);
        when(reportMapper.toDetail(report)).thenReturn(response);

        // Act
        ReportDetailResponse result = reportService.reviewReportByClub(request, userId);

        // Assert
        assertNotNull(result);
        assertEquals(ReportStatus.PENDING_UNIVERSITY, result.getStatus());
        verify(reportRepository).save(argThat(r ->
            r.getStatus() == ReportStatus.PENDING_UNIVERSITY
        ));
    }

    @Test
    void reviewReportByClub_ThrowsForbiddenException_WhenNotClubOfficer() {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.PENDING_CLUB);

        ReportReviewRequest request = new ReportReviewRequest();
        request.setReportId(report.getId());
        request.setStatus(ReportStatus.PENDING_UNIVERSITY);

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(false);

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.reviewReportByClub(request, userId)
        );
    }

    // ========== Additional Test Cases ==========

    @Test
    void deleteReport_ThrowsForbiddenException_WhenNotCreator() {
        // Arrange
        Long otherUserId = 999L;
        report.setStatus(ReportStatus.DRAFT);

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.deleteReport(report.getId(), otherUserId)
        );
    }

    @Test
    void createReport_ThrowsException_WhenClubNotActive() {
        // Arrange
        Long userId = user.getId();
        club.setStatus("INACTIVE");

        CreateReportRequest request = new CreateReportRequest();
        request.setClubId(club.getId());
        request.setReportTitle("New Report");
        request.setReportRequirementId(clubRequirement.getId());

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleMemberShipRepository.isClubOfficerOrTeamOfficerOrTreasurerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));

        // Act & Assert
        assertThrows(AppException.class, () ->
            reportService.createReport(request, null, userId)
        );
    }

    @Test
    void updateReport_ThrowsForbiddenException_WhenReportNotDraft() {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.PENDING_UNIVERSITY);

        UpdateReportRequest request = new UpdateReportRequest();
        request.setReportTitle("Updated Report");

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.updateReport(report.getId(), request, null, userId)
        );
    }

    @Test
    void updateReport_Success_WhenRejectedReport() throws AppException {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.REJECTED_CLUB);

        UpdateReportRequest request = new UpdateReportRequest();
        request.setReportTitle("Updated After Rejection");
        request.setContent("Revised content");

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenReturn(report);

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(report.getId());
        response.setReportTitle("Updated After Rejection");
        when(reportMapper.toDetail(report)).thenReturn(response);

        // Act
        ReportDetailResponse result = reportService.updateReport(report.getId(), request, null, userId);

        // Assert
        assertNotNull(result);
        assertEquals("Updated After Rejection", result.getReportTitle());
        verify(reportRepository).save(any(Report.class));
    }

    @Test
    void submitReport_ThrowsException_WhenClubNotActive() {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.DRAFT);
        club.setStatus("INACTIVE");

        SubmitReportRequest request = new SubmitReportRequest();
        request.setReportId(report.getId());

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));

        // Act & Assert
        assertThrows(AppException.class, () ->
            reportService.submitReport(request, userId)
        );
    }

    @Test
    void createReportRequirement_ThrowsNotFoundException_WhenEventNotFound() {
        // Arrange
        Long staffId = staffUser.getId();

        CreateReportRequirementRequest request = new CreateReportRequirementRequest();
        request.setTitle("Event Report");
        request.setReportType(ReportType.EVENT);
        request.setEventId(999L);
        request.setDueDate(LocalDateTime.now().plusDays(7));
        request.setClubIds(List.of(1L));

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(eventRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundException.class, () ->
            reportService.createReportRequirement(request, null, staffId)
        );
    }

    @Test
    void createReportRequirement_ThrowsNotFoundException_WhenClubNotFound() {
        // Arrange
        Long staffId = staffUser.getId();

        CreateReportRequirementRequest request = new CreateReportRequirementRequest();
        request.setTitle("Report Requirement");
        request.setReportType(ReportType.SEMESTER);
        request.setDueDate(LocalDateTime.now().plusDays(7));
        request.setClubIds(List.of(1L, 999L));

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staffUser));
        when(submissionReportRequirementRepository.save(any(SubmissionReportRequirement.class)))
            .thenReturn(submissionRequirement);
        when(clubRepository.findAllById(request.getClubIds())).thenReturn(List.of(club));

        // Act & Assert
        assertThrows(NotFoundException.class, () ->
            reportService.createReportRequirement(request, null, staffId)
        );
    }

    @Test
    void updateReportRequirement_ThrowsNotFoundException_WhenRequirementNotFound() {
        // Arrange
        Long staffId = staffUser.getId();
        Long requirementId = 999L;

        UpdateReportRequirementRequest request = new UpdateReportRequirementRequest();
        request.setTitle("Updated Report");

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(submissionReportRequirementRepository.findById(requirementId))
            .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundException.class, () ->
            reportService.updateReportRequirement(requirementId, request, null, staffId)
        );
    }

    @Test
    void updateReportRequirement_ThrowsForbiddenException_WhenNotStaff() {
        // Arrange
        Long userId = user.getId();
        Long requirementId = submissionRequirement.getId();

        UpdateReportRequirementRequest request = new UpdateReportRequirementRequest();
        request.setTitle("Updated Report");

        when(roleService.isStaff(userId)).thenReturn(false);

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.updateReportRequirement(requirementId, request, null, userId)
        );
    }

    @Test
    void getClubReportDetail_ThrowsForbiddenException_WhenReportNotBelongsToClub() {
        // Arrange
        Long userId = user.getId();
        Long wrongClubId = 999L;

        Club wrongClub = new Club();
        wrongClub.setId(wrongClubId);
        wrongClub.setClubName("Wrong Club");

        when(clubRepository.findById(wrongClubId)).thenReturn(Optional.of(wrongClub));
        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.getClubReportDetail(report.getId(), wrongClubId, userId)
        );
    }


    @Test
    void createReport_Success_AsTeamOfficer_CreatesAsDraft() throws AppException {
        // Arrange
        Long userId = user.getId();

        CreateReportRequest request = new CreateReportRequest();
        request.setClubId(club.getId());
        request.setReportTitle("Team Report");
        request.setContent("Report from team officer");
        request.setReportRequirementId(clubRequirement.getId());
        request.setAutoSubmit(false);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleMemberShipRepository.isClubOfficerOrTeamOfficerOrTreasurerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(submissionReportRequirementRepository.findById(clubRequirement.getId()))
            .thenReturn(Optional.of(submissionRequirement));
        when(clubReportRequirementRepository.findByClubIdAndSubmissionReportRequirementId(
            club.getId(), clubRequirement.getId()
        )).thenReturn(Optional.of(clubRequirement));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(false); // Not club officer, just team officer
        when(reportRepository.save(any(Report.class))).thenReturn(report);
        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(1L);
        response.setReportTitle("Team Report");
        response.setStatus(ReportStatus.DRAFT);
        when(reportMapper.toDetail(report)).thenReturn(response);

        // Act
        ReportDetailResponse result = reportService.createReport(request, null, userId);

        // Assert
        assertNotNull(result);
        verify(reportRepository).save(argThat(r -> r.getStatus() == ReportStatus.DRAFT));
    }
}

