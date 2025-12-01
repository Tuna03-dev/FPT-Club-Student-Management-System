package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.request.*;
import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.RecruitmentApplicationMapper;
import com.sep490.backendclubmanagement.mapper.RecruitmentMapper;
import com.sep490.backendclubmanagement.repository.*;
import com.sep490.backendclubmanagement.service.CloudinaryService;
import com.sep490.backendclubmanagement.service.NotificationService;
import com.sep490.backendclubmanagement.service.RecruitmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecruitmentServiceTest {

    @Mock
    private RecruitmentRepository recruitmentRepository;

    @Mock
    private RecruitmentApplicationRepository applicationRepository;

    @Mock
    private RecruitmentFormQuestionRepository questionRepository;

    @Mock
    private RecruitmentFormAnswerRepository answerRepository;

    @Mock
    private QuestionOptionRepository questionOptionRepository;

    @Mock
    private TeamOptionRepository teamOptionRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RecruitmentMapper recruitmentMapper;

    @Mock
    private RecruitmentApplicationMapper recruitmentApplicationMapper;

    @Mock
    private CloudinaryService cloudinaryService;

    @Mock
    private ClubMemberShipRepository clubMemberShipRepository;

    @Mock
    private RoleMemberShipRepository roleMembershipRepository;

    @Mock
    private SemesterRepository semesterRepository;

    @Mock
    private ClubRoleRepository clubRoleRepository;

    @Mock
    private ClubRepository clubRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private RecruitmentService recruitmentService;

    private Club testClub;
    private User testApplicant;
    private Semester testSemester;
    private Recruitment testRecruitment;
    private RecruitmentApplication testApplication;
    private Team testTeam;
    private RecruitmentData testRecruitmentData;
    private RecruitmentApplicationData testApplicationData;
    private ClubMemberShip testClubMembership;
    private RoleMemberShip testRoleMembership;
    private ClubRole testClubRole;

    private final Long testClubId = 1L;
    private final Long testUserId = 1L;
    private final Long testApplicantId = 2L;
    private final Long testRecruitmentId = 1L;
    private final Long testApplicationId = 1L;
    private final Long testTeamId = 1L;
    private final Long testSemesterId = 1L;

    @BeforeEach
    void setup() {
        // Setup Club
        testClub = Club.builder()
                .id(testClubId)
                .clubName("Test Club")
                .clubCode("TEST001")
                .status("ACTIVE")
                .build();

        // Setup User (Applicant)
        testApplicant = User.builder()
                .id(testApplicantId)
                .email("applicant@fpt.edu.vn")
                .fullName("Test Applicant")
                .studentCode("HE123456")
                .build();

        // Setup Semester
        testSemester = Semester.builder()
                .id(testSemesterId)
                .semesterName("Fall 2024")
                .isCurrent(true)
                .build();

        // Setup Team
        testTeam = Team.builder()
                .id(testTeamId)
                .teamName("Test Team")
                .club(testClub)
                .build();

        // Setup ClubRole
        testClubRole = ClubRole.builder()
                .id(1L)
                .roleName("Member")
                .roleCode("MEMBER")
                .club(testClub)
                .build();

        // Setup Recruitment
        testRecruitment = Recruitment.builder()
                .id(testRecruitmentId)
                .title("Test Recruitment")
                .description("Test Description")
                .status(RecruitmentStatus.OPEN)
                .endDate(LocalDateTime.now().plusDays(7))
                .club(testClub)
                .formQuestions(new HashSet<>())
                .teamOptions(new HashSet<>())
                .build();

        // Setup Recruitment Application
        testApplication = RecruitmentApplication.builder()
                .id(testApplicationId)
                .recruitment(testRecruitment)
                .applicant(testApplicant)
                .teamId(testTeamId)
                .status(RecruitmentApplicationStatus.UNDER_REVIEW)
                .submittedDate(LocalDateTime.now())
                .answers(new HashSet<>())
                .build();

        // Setup ClubMembership
        testClubMembership = ClubMemberShip.builder()
                .id(1L)
                .user(testApplicant)
                .club(testClub)
                .joinDate(LocalDate.now())
                .status(ClubMemberShipStatus.ACTIVE)
                .build();

        // Setup RoleMembership
        testRoleMembership = RoleMemberShip.builder()
                .id(1L)
                .clubMemberShip(testClubMembership)
                .team(testTeam)
                .clubRole(testClubRole)
                .semester(testSemester)
                .isActive(true)
                .build();

        // Setup DTOs
        testRecruitmentData = new RecruitmentData();
        testRecruitmentData.setId(testRecruitmentId);
        testRecruitmentData.setTitle("Test Recruitment");
        testRecruitmentData.setDescription("Test Description");
        testRecruitmentData.setStatus(RecruitmentStatus.OPEN);

        testApplicationData = new RecruitmentApplicationData();
        testApplicationData.setId(testApplicationId);
        testApplicationData.setStatus(RecruitmentApplicationStatus.UNDER_REVIEW);
    }

    // ==================== listRecruitments Tests ====================

    @Test
    void testListRecruitments_Success() throws AppException {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<Recruitment> recruitments = Arrays.asList(testRecruitment);
        Page<Recruitment> page = new PageImpl<>(recruitments, pageable, 1);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(recruitmentRepository.findByClub_Id(testClubId, pageable)).thenReturn(page);
        when(recruitmentMapper.toDtoForList(any(Recruitment.class))).thenReturn(testRecruitmentData);

        // Act
        PagedResponse<RecruitmentData> result = recruitmentService.listRecruitments(
                testUserId, testClubId, null, null, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        verify(roleMembershipRepository).isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId);
        verify(recruitmentRepository).findByClub_Id(testClubId, pageable);
    }

    @Test
    void testListRecruitments_InsufficientPermission() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(false);

        // Act & Assert
        AppException exception = assertThrows(AppException.class, () -> {
            recruitmentService.listRecruitments(testUserId, testClubId, null, null, pageable);
        });

        assertEquals(ErrorCode.INSUFFICIENT_PERMISSIONS, exception.getErrorCode());
    }

    @Test
    void testListRecruitments_WithStatus() throws AppException {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<Recruitment> recruitments = Arrays.asList(testRecruitment);
        Page<Recruitment> page = new PageImpl<>(recruitments, pageable, 1);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(recruitmentRepository.findByClub_IdAndStatus(testClubId, RecruitmentStatus.OPEN, pageable))
                .thenReturn(page);
        when(recruitmentMapper.toDtoForList(any(Recruitment.class))).thenReturn(testRecruitmentData);

        // Act
        PagedResponse<RecruitmentData> result = recruitmentService.listRecruitments(
                testUserId, testClubId, RecruitmentStatus.OPEN, null, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        verify(recruitmentRepository).findByClub_IdAndStatus(testClubId, RecruitmentStatus.OPEN, pageable);
    }

    @Test
    void testListRecruitmentsForGuest_Success() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<Recruitment> recruitments = Arrays.asList(testRecruitment);
        Page<Recruitment> page = new PageImpl<>(recruitments, pageable, 1);

        when(recruitmentRepository.findByClub_Id(testClubId, pageable)).thenReturn(page);
        when(recruitmentMapper.toDtoForList(any(Recruitment.class))).thenReturn(testRecruitmentData);

        // Act
        PagedResponse<RecruitmentData> result = recruitmentService.listRecruitmentsForGuest(
                testClubId, null, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        verify(recruitmentRepository).findByClub_Id(testClubId, pageable);
    }

    // ==================== getRecruitment Tests ====================

    @Test
    void testGetRecruitment_Success() throws AppException {
        // Arrange
        when(recruitmentRepository.findById(testRecruitmentId)).thenReturn(Optional.of(testRecruitment));
        when(questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(testRecruitmentId))
                .thenReturn(Collections.emptyList());
        when(teamOptionRepository.findByRecruitment_Id(testRecruitmentId))
                .thenReturn(Collections.emptyList());
        when(recruitmentMapper.toDto(any(Recruitment.class))).thenReturn(testRecruitmentData);

        // Act
        RecruitmentData result = recruitmentService.getRecruitment(testRecruitmentId);

        // Assert
        assertNotNull(result);
        assertEquals(testRecruitmentId, result.getId());
        verify(recruitmentRepository).findById(testRecruitmentId);
        verify(questionRepository).findByRecruitment_IdOrderByQuestionOrderAsc(testRecruitmentId);
        verify(teamOptionRepository).findByRecruitment_Id(testRecruitmentId);
    }

    @Test
    void testGetRecruitment_NotFound() {
        // Arrange
        when(recruitmentRepository.findById(testRecruitmentId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(AppException.class, () -> {
            recruitmentService.getRecruitment(testRecruitmentId);
        });
    }

    // ==================== createRecruitment Tests ====================

    @Test
    void testCreateRecruitment_Success() throws AppException {
        // Arrange
        RecruitmentCreateRequest request = new RecruitmentCreateRequest();
        request.title = "New Recruitment";
        request.description = "Description";
        request.endDate = LocalDateTime.now().plusDays(7);
        request.questions = new ArrayList<>();
        request.teamOptionIds = Arrays.asList(testTeamId);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(clubRepository.findById(testClubId)).thenReturn(Optional.of(testClub));
        when(recruitmentMapper.toEntity(any(RecruitmentCreateRequest.class), eq(testClubId)))
                .thenReturn(testRecruitment);
        when(recruitmentRepository.save(any(Recruitment.class))).thenReturn(testRecruitment);
        when(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam));
        when(questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(testRecruitmentId))
                .thenReturn(Collections.emptyList());
        when(teamOptionRepository.findByRecruitment_Id(testRecruitmentId))
                .thenReturn(Collections.emptyList());
        when(recruitmentMapper.toDto(any(Recruitment.class))).thenReturn(testRecruitmentData);
        when(semesterRepository.findByIsCurrentTrue()).thenReturn(Optional.of(testSemester));
        when(roleMembershipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(testClubId, testSemesterId))
                .thenReturn(Arrays.asList(testUserId));

        // Act
        RecruitmentData result = recruitmentService.createRecruitment(testUserId, testClubId, request);

        // Assert
        assertNotNull(result);
        verify(clubRepository).findById(testClubId);
        verify(recruitmentRepository).save(any(Recruitment.class));
    }

    @Test
    void testCreateRecruitment_ClubNotActive() {
        // Arrange
        testClub.setStatus("INACTIVE");
        RecruitmentCreateRequest request = new RecruitmentCreateRequest();
        request.title = "New Recruitment";
        request.endDate = LocalDateTime.now().plusDays(7);
        request.teamOptionIds = Arrays.asList(testTeamId);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(clubRepository.findById(testClubId)).thenReturn(Optional.of(testClub));

        // Act & Assert
        AppException exception = assertThrows(AppException.class, () -> {
            recruitmentService.createRecruitment(testUserId, testClubId, request);
        });

        assertEquals(ErrorCode.CLUB_NOT_ACTIVE, exception.getErrorCode());
    }

    @Test
    void testCreateRecruitment_EndDateInPast() {
        // Arrange
        RecruitmentCreateRequest request = new RecruitmentCreateRequest();
        request.title = "New Recruitment";
        request.endDate = LocalDateTime.now().minusDays(1); // Past date
        request.teamOptionIds = Arrays.asList(testTeamId);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(clubRepository.findById(testClubId)).thenReturn(Optional.of(testClub));

        // Act & Assert
        AppException exception = assertThrows(AppException.class, () -> {
            recruitmentService.createRecruitment(testUserId, testClubId, request);
        });

        assertEquals(ErrorCode.INVALID_INPUT, exception.getErrorCode());
    }

    // ==================== updateRecruitment Tests ====================

    @Test
    void testUpdateRecruitment_Success() throws AppException {
        // Arrange
        RecruitmentUpdateRequest request = new RecruitmentUpdateRequest();
        request.title = "Updated Title";
        request.description = "Updated Description";
        request.endDate = LocalDateTime.now().plusDays(10);
        request.questions = new ArrayList<>();
        request.teamOptionIds = Arrays.asList(testTeamId);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(recruitmentRepository.findById(testRecruitmentId)).thenReturn(Optional.of(testRecruitment));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(recruitmentRepository.save(any(Recruitment.class))).thenReturn(testRecruitment);
        when(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam));
        when(questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(testRecruitmentId))
                .thenReturn(Collections.emptyList());
        when(teamOptionRepository.findByRecruitment_Id(testRecruitmentId))
                .thenReturn(Collections.emptyList());
        when(recruitmentMapper.toDto(any(Recruitment.class))).thenReturn(testRecruitmentData);

        // Act
        RecruitmentData result = recruitmentService.updateRecruitment(testUserId, testRecruitmentId, request);

        // Assert
        assertNotNull(result);
        verify(recruitmentRepository).save(any(Recruitment.class));
    }

    // ==================== changeRecruitmentStatus Tests ====================

    @Test
    void testChangeRecruitmentStatus_ToOpen() throws AppException {
        // Arrange
        testRecruitment.setStatus(RecruitmentStatus.DRAFT);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(recruitmentRepository.findById(testRecruitmentId)).thenReturn(Optional.of(testRecruitment));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(recruitmentRepository.findByClub_IdAndStatusAndIdNot(testClubId, RecruitmentStatus.OPEN, testRecruitmentId))
                .thenReturn(Collections.emptyList());
        when(semesterRepository.findByIsCurrentTrue()).thenReturn(Optional.of(testSemester));
        when(roleMembershipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(testClubId, testSemesterId))
                .thenReturn(Arrays.asList(testUserId));

        // Act
        recruitmentService.changeRecruitmentStatus(testUserId, testRecruitmentId, RecruitmentStatus.OPEN);

        // Assert
        verify(recruitmentRepository).save(testRecruitment);
        assertEquals(RecruitmentStatus.OPEN, testRecruitment.getStatus());
    }

    @Test
    void testChangeRecruitmentStatus_ToClosed() throws AppException {
        // Arrange
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(recruitmentRepository.findById(testRecruitmentId)).thenReturn(Optional.of(testRecruitment));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);

        // Act
        recruitmentService.changeRecruitmentStatus(testUserId, testRecruitmentId, RecruitmentStatus.CLOSED);

        // Assert
        verify(recruitmentRepository).save(testRecruitment);
        assertEquals(RecruitmentStatus.CLOSED, testRecruitment.getStatus());
    }

    // ==================== submitApplication Tests ====================

    @Test
    void testSubmitApplication_Success() throws AppException {
        // Arrange
        ApplicationSubmitRequest request = new ApplicationSubmitRequest();
        request.recruitmentId = testRecruitmentId;
        request.teamId = testTeamId;
        request.answers = new ArrayList<>();

        MockMultipartFile file = new MockMultipartFile(
                "file", "cv.pdf", "application/pdf", "test content".getBytes());

        when(recruitmentRepository.findById(testRecruitmentId)).thenReturn(Optional.of(testRecruitment));
        when(userRepository.findById(testApplicantId)).thenReturn(Optional.of(testApplicant));
        when(clubMemberShipRepository.existsByUserIdAndClubId(testApplicantId, testClubId)).thenReturn(false);
        when(applicationRepository.findByApplicant_IdAndRecruitment_Id(testApplicantId, testRecruitmentId))
                .thenReturn(Optional.empty());
        when(questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(testRecruitmentId))
                .thenReturn(Collections.emptyList());
        when(cloudinaryService.uploadFile(any(MultipartFile.class)))
                .thenReturn(new CloudinaryService.UploadResult("http://cloudinary.com/cv.pdf", "public-id", "pdf", 1024L));
        when(applicationRepository.save(any(RecruitmentApplication.class))).thenReturn(testApplication);
        when(semesterRepository.findByIsCurrentTrue()).thenReturn(Optional.of(testSemester));
        when(roleMembershipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(testClubId, testSemesterId))
                .thenReturn(Collections.emptyList());
        // Mock for getApplicationInternal
        when(applicationRepository.findById(testApplicationId)).thenReturn(Optional.of(testApplication));
        when(answerRepository.findByApplication_Id(testApplicationId)).thenReturn(Collections.emptyList());
        when(recruitmentApplicationMapper.toDto(any(RecruitmentApplication.class))).thenReturn(testApplicationData);
        when(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam));

        // Act
        RecruitmentApplicationData result = recruitmentService.submitApplication(testApplicantId, request, file);

        // Assert
        assertNotNull(result);
        verify(applicationRepository).save(any(RecruitmentApplication.class));
        verify(cloudinaryService).uploadFile(file);
    }

    @Test
    void testSubmitApplication_RecruitmentNotOpen() {
        // Arrange
        testRecruitment.setStatus(RecruitmentStatus.CLOSED);
        ApplicationSubmitRequest request = new ApplicationSubmitRequest();
        request.recruitmentId = testRecruitmentId;
        request.teamId = testTeamId;

        when(recruitmentRepository.findById(testRecruitmentId)).thenReturn(Optional.of(testRecruitment));

        // Act & Assert
        AppException exception = assertThrows(AppException.class, () ->
            recruitmentService.submitApplication(testApplicantId, request, null)
        );

        assertEquals(ErrorCode.RECRUITMENT_CLOSED, exception.getErrorCode());
    }

    @Test
    void testSubmitApplication_AlreadySubmitted() {
        // Arrange
        ApplicationSubmitRequest request = new ApplicationSubmitRequest();
        request.recruitmentId = testRecruitmentId;
        request.teamId = testTeamId;

        when(recruitmentRepository.findById(testRecruitmentId)).thenReturn(Optional.of(testRecruitment));
        when(userRepository.findById(testApplicantId)).thenReturn(Optional.of(testApplicant));
        when(clubMemberShipRepository.existsByUserIdAndClubId(testApplicantId, testClubId)).thenReturn(false);
        when(applicationRepository.findByApplicant_IdAndRecruitment_Id(testApplicantId, testRecruitmentId))
                .thenReturn(Optional.of(testApplication));

        // Act & Assert
        AppException exception = assertThrows(AppException.class, () ->
            recruitmentService.submitApplication(testApplicantId, request, null)
        );

        assertEquals(ErrorCode.ALREADY_APPLIED, exception.getErrorCode());
    }

    // ==================== listApplications Tests ====================

    @Test
    void testListApplications_Success() throws AppException {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<RecruitmentApplication> applications = Collections.singletonList(testApplication);
        Page<RecruitmentApplication> page = new PageImpl<>(applications, pageable, 1);

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(recruitmentRepository.findById(testRecruitmentId)).thenReturn(Optional.of(testRecruitment));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(applicationRepository.findApplicationsByRecruitment(eq(testRecruitmentId), isNull(), isNull(), eq(pageable)))
                .thenReturn(page);
        when(recruitmentApplicationMapper.toDto(any(RecruitmentApplication.class))).thenReturn(testApplicationData);
        when(teamRepository.findAllById(anySet())).thenReturn(Collections.singletonList(testTeam));

        // Act
        PagedResponse<RecruitmentApplicationData> result = recruitmentService.listApplications(
                testUserId, testRecruitmentId, null, null, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        verify(applicationRepository).findApplicationsByRecruitment(eq(testRecruitmentId), isNull(), isNull(), eq(pageable));
    }

    // ==================== listMyApplications Tests ====================

    @Test
    void testListMyApplications_Success() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<RecruitmentApplication> applications = Collections.singletonList(testApplication);
        Page<RecruitmentApplication> page = new PageImpl<>(applications, pageable, 1);

        when(applicationRepository.findMyApplications(eq(testApplicantId), isNull(), isNull(), eq(pageable)))
                .thenReturn(page);
        when(recruitmentApplicationMapper.toDto(any(RecruitmentApplication.class))).thenReturn(testApplicationData);
        when(teamRepository.findAllById(anySet())).thenReturn(Collections.singletonList(testTeam));

        // Act
        PagedResponse<RecruitmentApplicationData> result = recruitmentService.listMyApplications(
                testApplicantId, null, null, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        verify(applicationRepository).findMyApplications(eq(testApplicantId), isNull(), isNull(), eq(pageable));
    }

    // ==================== getApplication Tests ====================

    @Test
    void testGetApplication_Success() throws AppException {
        // Arrange
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(applicationRepository.findById(testApplicationId)).thenReturn(Optional.of(testApplication));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(answerRepository.findByApplication_Id(testApplicationId)).thenReturn(Collections.emptyList());
        when(recruitmentApplicationMapper.toDto(any(RecruitmentApplication.class))).thenReturn(testApplicationData);
        when(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam));

        // Act
        RecruitmentApplicationData result = recruitmentService.getApplication(testUserId, testApplicationId);

        // Assert
        assertNotNull(result);
        verify(applicationRepository).findById(testApplicationId);
    }

    // ==================== getMyApplication Tests ====================

    @Test
    void testGetMyApplication_Success() throws AppException {
        // Arrange
        when(applicationRepository.findById(testApplicationId)).thenReturn(Optional.of(testApplication));
        when(answerRepository.findByApplication_Id(testApplicationId)).thenReturn(Collections.emptyList());
        when(recruitmentApplicationMapper.toDto(any(RecruitmentApplication.class))).thenReturn(testApplicationData);
        when(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam));

        // Act
        RecruitmentApplicationData result = recruitmentService.getMyApplication(testApplicantId, testApplicationId);

        // Assert
        assertNotNull(result);
        assertEquals(testApplicationId, result.getId());
        verify(applicationRepository).findById(testApplicationId);
    }

    @Test
    void testGetMyApplication_NotOwner() {
        // Arrange
        Long otherUserId = 999L;
        when(applicationRepository.findById(testApplicationId)).thenReturn(Optional.of(testApplication));

        // Act & Assert
        AppException exception = assertThrows(AppException.class, () -> {
            recruitmentService.getMyApplication(otherUserId, testApplicationId);
        });

        assertEquals(ErrorCode.INSUFFICIENT_PERMISSIONS, exception.getErrorCode());
    }

    // ==================== reviewApplication Tests ====================

    @Test
    void testReviewApplication_Accept() throws AppException {
        // Arrange
        ApplicationReviewRequest request = new ApplicationReviewRequest();
        request.applicationId = testApplicationId;
        request.status = RecruitmentApplicationStatus.ACCEPTED;
        request.reviewNotes = "Good candidate";

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(applicationRepository.findById(testApplicationId)).thenReturn(Optional.of(testApplication));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(clubMemberShipRepository.existsByUserIdAndClubId(testApplicantId, testClubId)).thenReturn(false);
        when(clubMemberShipRepository.save(any(ClubMemberShip.class))).thenReturn(testClubMembership);
        when(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam));
        when(clubRoleRepository.findByClubIdAndRoleCode(testClubId, "MEMBER")).thenReturn(Optional.of(testClubRole));
        when(roleMembershipRepository.save(any(RoleMemberShip.class))).thenReturn(testRoleMembership);
        when(applicationRepository.save(any(RecruitmentApplication.class))).thenReturn(testApplication);
        when(answerRepository.findByApplication_Id(testApplicationId)).thenReturn(Collections.emptyList());
        when(recruitmentApplicationMapper.toDto(any(RecruitmentApplication.class))).thenReturn(testApplicationData);

        // Act
        RecruitmentApplicationData result = recruitmentService.reviewApplication(testUserId, request);

        // Assert
        assertNotNull(result);
        verify(applicationRepository).save(any(RecruitmentApplication.class));
        verify(clubMemberShipRepository).save(any(ClubMemberShip.class));
        verify(roleMembershipRepository).save(any(RoleMemberShip.class));
    }

    @Test
    void testReviewApplication_Reject() throws AppException {
        // Arrange
        ApplicationReviewRequest request = new ApplicationReviewRequest();
        request.applicationId = testApplicationId;
        request.status = RecruitmentApplicationStatus.REJECTED;
        request.reviewNotes = "Not suitable";

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(applicationRepository.findById(testApplicationId)).thenReturn(Optional.of(testApplication));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(applicationRepository.save(any(RecruitmentApplication.class))).thenReturn(testApplication);
        when(answerRepository.findByApplication_Id(testApplicationId)).thenReturn(Collections.emptyList());
        when(recruitmentApplicationMapper.toDto(any(RecruitmentApplication.class))).thenReturn(testApplicationData);
        when(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam));

        // Act
        RecruitmentApplicationData result = recruitmentService.reviewApplication(testUserId, request);

        // Assert
        assertNotNull(result);
        verify(applicationRepository).save(any(RecruitmentApplication.class));
        verify(clubMemberShipRepository, never()).save(any(ClubMemberShip.class));
    }

    // ==================== updateInterviewSchedule Tests ====================

    @Test
    void testUpdateInterviewSchedule_Success() throws AppException {
        // Arrange
        InterviewUpdateRequest request = new InterviewUpdateRequest();
        request.applicationId = testApplicationId;
        request.interviewTime = LocalDateTime.now().plusDays(3);
        request.interviewAddress = "Room 101";
        request.interviewPreparationRequirements = "Please bring your CV";

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(testSemester));
        when(applicationRepository.findById(testApplicationId)).thenReturn(Optional.of(testApplication));
        when(roleMembershipRepository.isClubOfficerInCurrentSemester(testUserId, testClubId, testSemesterId))
                .thenReturn(true);
        when(applicationRepository.save(any(RecruitmentApplication.class))).thenReturn(testApplication);
        when(answerRepository.findByApplication_Id(testApplicationId)).thenReturn(Collections.emptyList());
        when(recruitmentApplicationMapper.toDto(any(RecruitmentApplication.class))).thenReturn(testApplicationData);
        when(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam));

        // Act
        RecruitmentApplicationData result = recruitmentService.updateInterviewSchedule(testUserId, request);

        // Assert
        assertNotNull(result);
        verify(applicationRepository).save(any(RecruitmentApplication.class));
        verify(notificationService).sendToUser(
                eq(testApplicantId),
                eq(testUserId),
                anyString(),
                anyString(),
                any(),
                any(),
                anyString(),
                eq(testClubId),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
    }

    // ==================== closeExpiredRecruitments Tests ====================

    @Test
    void testCloseExpiredRecruitments_Success() {
        // Arrange
        LocalDateTime now = LocalDateTime.now();
        when(recruitmentRepository.closeExpiredRecruitments(
                RecruitmentStatus.CLOSED, RecruitmentStatus.OPEN, now))
                .thenReturn(3);

        // Act
        int result = recruitmentService.closeExpiredRecruitments(now);

        // Assert
        assertEquals(3, result);
        verify(recruitmentRepository).closeExpiredRecruitments(
                RecruitmentStatus.CLOSED, RecruitmentStatus.OPEN, now);
    }
}

