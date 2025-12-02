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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
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
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private NotificationService notificationService;

    // Create a real synchronous executor for testing instead of mocking
    private final Executor taskExecutor = Runnable::run;

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
        // Inject taskExecutor into reportService using reflection
        ReflectionTestUtils.setField(reportService, "taskExecutor", taskExecutor);

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
        // Don't set report by default - it should be set in specific tests

        report = new Report();
        report.setId(1L);
        report.setReportTitle("Test Report");
        report.setContent("Test content");
        report.setStatus(ReportStatus.DRAFT);
        report.setClubReportRequirement(clubRequirement);
        report.setSemester(currentSemester);
        report.setCreatedBy(user);
        report.setMustResubmit(false);
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
            any(), any(), any(), any(), any(), any(Pageable.class)
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
            reportService.getAllReports(null, null, null, null, null, pageable, userId
        ));
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
    void reviewReport_Success_WhenStaffApprovesReport() {
        // Arrange
        Long staffId = staffUser.getId();
        report.setStatus(ReportStatus.PENDING_UNIVERSITY);
        report.setClubReportRequirement(clubRequirement);
        clubRequirement.setReport(report);

        ReportReviewRequest request = new ReportReviewRequest();
        request.setReportId(report.getId());
        request.setStatus(ReportStatus.APPROVED_UNIVERSITY);
        request.setReviewerFeedback("Approved by university");

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock for async notification logic
        when(semesterRepository.findByIsCurrentTrue()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(anyLong(), anyLong()))
            .thenReturn(List.of(user.getId()));
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

        // Act
        reportService.reviewReport(request, staffId);

        // Assert
        verify(reportRepository).save(argThat(r ->
            r.getStatus() == ReportStatus.APPROVED_UNIVERSITY &&
            r.getReviewedDate() != null &&
            !r.isMustResubmit() &&
            r.getReviewerFeedback() != null
        ));
    }

    @Test
    void reviewReport_Success_WhenStaffRejectsReport() {
        // Arrange
        Long staffId = staffUser.getId();
        report.setStatus(ReportStatus.PENDING_UNIVERSITY);
        report.setClubReportRequirement(clubRequirement);
        clubRequirement.setReport(report);

        ReportReviewRequest request = new ReportReviewRequest();
        request.setReportId(report.getId());
        request.setStatus(ReportStatus.REJECTED_UNIVERSITY);
        request.setReviewerFeedback("Needs revision");
        request.setMustResubmit(true);

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock for async notification logic
        when(semesterRepository.findByIsCurrentTrue()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(anyLong(), anyLong()))
            .thenReturn(List.of(user.getId()));
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

        // Act
        reportService.reviewReport(request, staffId);

        // Assert
        verify(reportRepository).save(argThat(r ->
            r.getStatus() == ReportStatus.REJECTED_UNIVERSITY &&
            r.getReviewedDate() != null &&
            r.isMustResubmit() &&
            "Needs revision".equals(r.getReviewerFeedback())
        ));
    }

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
        when(clubRepository.findAllById(request.getClubIds())).thenReturn(List.of(club, club2));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staffUser));
        when(submissionReportRequirementRepository.save(any(SubmissionReportRequirement.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(clubReportRequirementRepository.saveAll(anyList()))
            .thenAnswer(invocation -> invocation.getArgument(0));

        ReportRequirementResponse response = new ReportRequirementResponse();
        response.setId(1L);
        response.setTitle("Monthly Report");
        when(submissionReportRequirementMapper.toDto(any(SubmissionReportRequirement.class))).thenReturn(response);

        // Mock for async notification
        when(semesterRepository.findByIsCurrentTrue()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.findClubOfficerUserIdsByClubIdsAndSemesterId(anyList(), anyLong()))
            .thenReturn(List.of());
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

        // Act
        ReportRequirementResponse result = reportService.createReportRequirement(request, null, staffId);

        // Assert
        assertNotNull(result);
        assertEquals("Monthly Report", result.getTitle());
        verify(submissionReportRequirementRepository).save(any(SubmissionReportRequirement.class));
        verify(clubReportRequirementRepository).saveAll(anyList());
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
        when(clubRepository.findAllById(request.getClubIds())).thenReturn(List.of(club));
        when(eventRepository.findById(event.getId())).thenReturn(Optional.of(event));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staffUser));
        when(submissionReportRequirementRepository.save(any(SubmissionReportRequirement.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(clubReportRequirementRepository.saveAll(anyList()))
            .thenAnswer(invocation -> invocation.getArgument(0));

        ReportRequirementResponse response = new ReportRequirementResponse();
        response.setId(1L);
        response.setTitle("Event Report");
        when(submissionReportRequirementMapper.toDto(any(SubmissionReportRequirement.class))).thenReturn(response);

        // Mock for async notification
        when(semesterRepository.findByIsCurrentTrue()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.findClubOfficerUserIdsByClubIdsAndSemesterId(anyList(), anyLong()))
            .thenReturn(List.of());
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

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
        when(clubRepository.findAllById(request.getClubIds())).thenReturn(List.of(club));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staffUser));

        CloudinaryService.UploadResult uploadResult = new CloudinaryService.UploadResult(
            "http://cloudinary.com/template.pdf", "template_id", "pdf", 1024L
        );
        when(cloudinaryService.uploadFileAsync(eq(file), anyString()))
            .thenReturn(CompletableFuture.completedFuture(uploadResult));

        when(submissionReportRequirementRepository.save(any(SubmissionReportRequirement.class)))
            .thenAnswer(invocation -> {
                SubmissionReportRequirement saved = invocation.getArgument(0);
                saved.setId(1L);
                return saved;
            });
        when(clubReportRequirementRepository.saveAll(anyList()))
            .thenAnswer(invocation -> {
                List<ClubReportRequirement> list = invocation.getArgument(0);
                for (int i = 0; i < list.size(); i++) {
                    list.get(i).setId((long) (i + 1));
                }
                return list;
            });

        ReportRequirementResponse response = new ReportRequirementResponse();
        response.setId(1L);
        response.setTitle("Monthly Report");
        when(submissionReportRequirementMapper.toDto(any(SubmissionReportRequirement.class))).thenReturn(response);

        // Mock for async notification
        when(semesterRepository.findByIsCurrentTrue()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.findClubOfficerUserIdsByClubIdsAndSemesterId(anyList(), anyLong()))
            .thenReturn(List.of());
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

        // Act
        ReportRequirementResponse result = reportService.createReportRequirement(request, file, staffId);

        // Assert
        assertNotNull(result);
        verify(cloudinaryService).uploadFileAsync(eq(file), anyString());
        verify(submissionReportRequirementRepository).save(argThat(req ->
            "http://cloudinary.com/template.pdf".equals(req.getTemplateUrl())
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
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(clubReportRequirementRepository.findBySubmissionReportRequirementId(requirementId))
            .thenReturn(List.of(clubRequirement));

        ReportRequirementResponse response = new ReportRequirementResponse();
        response.setId(requirementId);
        response.setTitle("Updated Monthly Report");
        when(submissionReportRequirementMapper.toDto(any(SubmissionReportRequirement.class))).thenReturn(response);

        // Mock for async notification
        when(semesterRepository.findByIsCurrentTrue()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.findClubOfficerUserIdsByClubIdsAndSemesterId(anyList(), anyLong()))
            .thenReturn(List.of());
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

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

        // Create a new clubRequirement without report for this test
        ClubReportRequirement emptyClubRequirement = new ClubReportRequirement();
        emptyClubRequirement.setId(1L);
        emptyClubRequirement.setClub(club);
        emptyClubRequirement.setSubmissionReportRequirement(submissionRequirement);
        emptyClubRequirement.setReport(null); // Ensure no report exists

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerOrTeamOfficerOrTreasurerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(submissionReportRequirementRepository.findById(emptyClubRequirement.getId()))
            .thenReturn(Optional.of(submissionRequirement));
        when(clubReportRequirementRepository.findByClubIdAndSubmissionReportRequirementId(
            club.getId(), emptyClubRequirement.getId()
        )).thenReturn(Optional.of(emptyClubRequirement));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> {
            Report savedReport = invocation.getArgument(0);
            savedReport.setId(1L);
            return savedReport;
        });

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(1L);
        response.setReportTitle("New Report");
        response.setStatus(ReportStatus.PENDING_CLUB);
        when(reportMapper.toDetail(any(Report.class))).thenReturn(response);

        // Mock for async notification (sendReportSubmittedNotificationAsync)
        when(roleMemberShipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(anyLong(), anyLong()))
            .thenReturn(List.of(user.getId()));
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

        // Act
        ReportDetailResponse result = reportService.createReport(request, null, userId);

        // Assert
        assertNotNull(result);
        assertEquals("New Report", result.getReportTitle());
        assertEquals(ReportStatus.PENDING_CLUB, result.getStatus());
        verify(reportRepository).save(argThat(r ->
            r.getStatus() == ReportStatus.PENDING_CLUB &&
            r.getSubmittedDate() != null
        ));
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
        when(roleMemberShipRepository.isClubOfficerOrTeamOfficerOrTreasurerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(false);

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.createReport(request, null, userId)
        );

        // Verify it fails before accessing other repositories
        verify(clubRepository, never()).findById(anyLong());
        verify(userRepository, never()).findById(anyLong());
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
        report.setClubReportRequirement(clubRequirement);
        clubRequirement.setReport(report);

        SubmitReportRequest request = new SubmitReportRequest();
        request.setReportId(report.getId());

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock for async notification (sendSubmitReportNotificationAsync)
        when(roleMemberShipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(anyLong(), anyLong()))
            .thenReturn(List.of(user.getId()));
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(report.getId());
        response.setStatus(ReportStatus.PENDING_CLUB);
        when(reportMapper.toDetail(any(Report.class))).thenReturn(response);

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
        report.setClubReportRequirement(clubRequirement);
        clubRequirement.setReport(report);

        SubmitReportRequest request = new SubmitReportRequest();
        request.setReportId(report.getId());

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock for async notification
        when(roleMemberShipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(anyLong(), anyLong()))
            .thenReturn(List.of(user.getId()));
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(report.getId());
        response.setStatus(ReportStatus.UPDATED_PENDING_CLUB);
        when(reportMapper.toDetail(any(Report.class))).thenReturn(response);

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

        when(clubRepository.existsById(club.getId())).thenReturn(true);
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

        when(clubRepository.existsById(club.getId())).thenReturn(true);
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(false);

        // Act & Assert
        assertThrows(ForbiddenException.class, () ->
            reportService.getClubReports(club.getId(), null, null, null, null, pageable, userId)
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

        // Setup clubRequirement with proper relationship
        clubRequirement.setSubmissionReportRequirement(submissionRequirement);

        when(roleService.isStaff(staffId)).thenReturn(true);
        when(submissionReportRequirementRepository.findAllWithFilters(
            any(), any(), any(), eq(pageable)
        )).thenReturn(requirementPage);
        when(clubReportRequirementRepository.findBySubmissionReportRequirementIdIn(anyList()))
            .thenReturn(List.of(clubRequirement));

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
        verify(clubReportRequirementRepository).findBySubmissionReportRequirementIdIn(anyList());
    }

    // ========== reviewReportByClub ==========

    @Test
    void reviewReportByClub_Success_WhenClubOfficerApproves() throws AppException {
        // Arrange
        Long userId = user.getId();
        report.setStatus(ReportStatus.PENDING_CLUB);
        report.setClubReportRequirement(clubRequirement);
        clubRequirement.setReport(report);

        ReportReviewRequest request = new ReportReviewRequest();
        request.setReportId(report.getId());
        request.setStatus(ReportStatus.PENDING_UNIVERSITY);
        request.setReviewerFeedback("Approved by club");

        when(reportRepository.findByIdWithRelations(report.getId())).thenReturn(Optional.of(report));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock for async notification (sendClubReviewNotificationAsync -> getStaffUsers)
        when(userRepository.findBySystemRole_RoleNameIgnoreCase("STAFF")).thenReturn(List.of(staffUser));
        doNothing().when(notificationService).sendToUsersAsync(
            anyList(), anyLong(), anyString(), anyString(), any(), any(), anyString(),
            anyLong(), anyLong(), anyLong(), anyLong());

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(report.getId());
        response.setStatus(ReportStatus.PENDING_UNIVERSITY);
        when(reportMapper.toDetail(any(Report.class))).thenReturn(response);

        // Act
        ReportDetailResponse result = reportService.reviewReportByClub(request, userId);

        // Assert
        assertNotNull(result);
        assertEquals(ReportStatus.PENDING_UNIVERSITY, result.getStatus());
        verify(reportRepository).save(argThat(r ->
            r.getStatus() == ReportStatus.PENDING_UNIVERSITY &&
            r.getReviewedDate() != null
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
    void createReport_ThrowsException_WhenClubNotActive() {
        // Arrange
        Long userId = user.getId();
        Club inactiveClub = new Club();
        inactiveClub.setId(1L);
        inactiveClub.setClubName("Test Club");
        inactiveClub.setStatus("INACTIVE");

        CreateReportRequest request = new CreateReportRequest();
        request.setClubId(inactiveClub.getId());
        request.setReportTitle("New Report");
        request.setReportRequirementId(clubRequirement.getId());

        ClubReportRequirement emptyClubRequirement = new ClubReportRequirement();
        emptyClubRequirement.setId(1L);
        emptyClubRequirement.setClub(inactiveClub);
        emptyClubRequirement.setSubmissionReportRequirement(submissionRequirement);
        emptyClubRequirement.setReport(null);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.isClubOfficerOrTeamOfficerOrTreasurerInCurrentSemester(
            userId, inactiveClub.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(clubRepository.findById(inactiveClub.getId())).thenReturn(Optional.of(inactiveClub));

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
        Club inactiveClub = new Club();
        inactiveClub.setId(1L);
        inactiveClub.setStatus("INACTIVE");

        ClubReportRequirement inactiveClubReq = new ClubReportRequirement();
        inactiveClubReq.setId(1L);
        inactiveClubReq.setClub(inactiveClub);
        inactiveClubReq.setSubmissionReportRequirement(submissionRequirement);

        Report inactiveReport = new Report();
        inactiveReport.setId(1L);
        inactiveReport.setStatus(ReportStatus.DRAFT);
        inactiveReport.setClubReportRequirement(inactiveClubReq);
        inactiveReport.setCreatedBy(user);
        inactiveClubReq.setReport(inactiveReport);

        SubmitReportRequest request = new SubmitReportRequest();
        request.setReportId(inactiveReport.getId());

        when(reportRepository.findByIdWithRelations(inactiveReport.getId())).thenReturn(Optional.of(inactiveReport));

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
        when(clubRepository.findAllById(request.getClubIds())).thenReturn(List.of(club));
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
        when(clubRepository.findAllById(request.getClubIds())).thenReturn(List.of(club)); // Only 1 club found instead of 2

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
    void createReport_Success_AsTeamOfficer_CreatesAsDraft() throws AppException {
        // Arrange
        Long userId = user.getId();

        CreateReportRequest request = new CreateReportRequest();
        request.setClubId(club.getId());
        request.setReportTitle("Team Report");
        request.setContent("Report from team officer");
        request.setReportRequirementId(clubRequirement.getId());
        request.setAutoSubmit(false);

        // Create a new clubRequirement without report for this test
        ClubReportRequirement emptyClubRequirement = new ClubReportRequirement();
        emptyClubRequirement.setId(1L);
        emptyClubRequirement.setClub(club);
        emptyClubRequirement.setSubmissionReportRequirement(submissionRequirement);
        emptyClubRequirement.setReport(null); // Ensure no report exists

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleMemberShipRepository.isClubOfficerOrTeamOfficerOrTreasurerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(true);
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(submissionReportRequirementRepository.findById(emptyClubRequirement.getId()))
            .thenReturn(Optional.of(submissionRequirement));
        when(clubReportRequirementRepository.findByClubIdAndSubmissionReportRequirementId(
            club.getId(), emptyClubRequirement.getId()
        )).thenReturn(Optional.of(emptyClubRequirement));
        when(roleMemberShipRepository.isClubOfficerInCurrentSemester(
            userId, club.getId(), currentSemester.getId()
        )).thenReturn(false); // Not club officer, just team officer
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> {
            Report savedReport = invocation.getArgument(0);
            savedReport.setId(1L);
            return savedReport;
        });

        ReportDetailResponse response = new ReportDetailResponse();
        response.setId(1L);
        response.setReportTitle("Team Report");
        response.setStatus(ReportStatus.DRAFT);
        when(reportMapper.toDetail(any(Report.class))).thenReturn(response);

        // Act
        ReportDetailResponse result = reportService.createReport(request, null, userId);

        // Assert
        assertNotNull(result);
        verify(reportRepository).save(argThat(r -> r.getStatus() == ReportStatus.DRAFT));
    }
}

