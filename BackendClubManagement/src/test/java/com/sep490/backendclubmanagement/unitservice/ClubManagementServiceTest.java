package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.ResourceNotFoundException;
import com.sep490.backendclubmanagement.repository.*;
import com.sep490.backendclubmanagement.service.ClubManagementService;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClubManagementServiceTest {

    @Mock private ClubMemberShipRepository clubMembershipRepository;
    @Mock private SemesterRepository semesterRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private RoleMemberShipRepository roleMembershipRepository;
    @Mock private PostRepository postRepository;
    @Mock private NewsRepository newsRepository;
    @Mock private ClubRepository clubRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private ClubManagementService service;

    private MockedStatic<SecurityContextHolder> securityContextMock;

    @BeforeEach
    void setupSecurityContext() {
        securityContextMock = mockStatic(SecurityContextHolder.class);
    }

    @AfterEach
    void tearDown() {
        securityContextMock.close();
    }

    // ===================== HELPER =====================
    private User mockCurrentUser(Long userId, String email) {
        User u = new User();
        u.setId(userId);
        u.setEmail(email);
        u.setFullName("User " + userId);
        u.setIsActive(true);

        UserDetails ud = mock(UserDetails.class);
        when(ud.getUsername()).thenReturn(email);

        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(ud);
        when(authentication.isAuthenticated()).thenReturn(true);

        SecurityContext ctx = mock(SecurityContext.class);
        when(ctx.getAuthentication()).thenReturn(authentication);

        securityContextMock.when(SecurityContextHolder::getContext).thenReturn(ctx);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(u));

        return u;
    }

    // ===================== TESTS =====================

    @Test
    void getMyClubs_happyPath() {
        User user = mockCurrentUser(10L, "user@example.com");

        Semester sem = new Semester();
        sem.setId(5L);
        sem.setIsCurrent(true);
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(sem));

        MyClubDTO dto = new MyClubDTO();
        dto.setClubId(1L);
        dto.setClubName("CLB Dev");

        // ✅ MOCK ĐÚNG METHOD MỚI
        when(clubMembershipRepository.findActiveClubsByUserId(user.getId()))
                .thenReturn(List.of(dto));

        when(roleMembershipRepository.findClubRolesByUserAndClub(user.getId(), 1L, sem.getId()))
                .thenReturn(List.of("CLUB_PRESIDENT"));

        List<MyClubDTO> result = service.getMyClubs();

        assertEquals(1, result.size());
        assertEquals("CLB Dev", result.get(0).getClubName());
        assertEquals(1, result.get(0).getClubRoles().size());
    }

    @Test
    void getClubManagementDetail_happyPath() {
        User user = mockCurrentUser(10L, "user@example.com");

        Semester sem = new Semester();
        sem.setId(5L);
        sem.setIsCurrent(true);
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(sem));

        // ✅ validateUserMembership()
        MyClubDTO myClub = new MyClubDTO();
        myClub.setClubId(1L);
        myClub.setClubName("CLB Dev");

        when(clubMembershipRepository.findActiveClubsByUserId(user.getId()))
                .thenReturn(List.of(myClub));

        Club club = new Club();
        club.setId(1L);
        club.setClubName("CLB Dev");
        when(clubRepository.findById(1L)).thenReturn(Optional.of(club));

        Team team = new Team();
        team.setId(100L);
        team.setTeamName("Ban Truyền thông");
        when(teamRepository.findAllByClubId(1L)).thenReturn(List.of(team));

        TeamMemberDTO member = new TeamMemberDTO();
        member.setUserId(20L);
        member.setFullName("Member 1");
        when(roleMembershipRepository.findMembersByTeamIdAndSemesterId(100L, sem.getId()))
                .thenReturn(List.of(member));

        ActivityDTO act = new ActivityDTO();
        act.setId(1000L);
        act.setType("POST");
        act.setCreatedAt(LocalDateTime.now());

        when(postRepository.findActivitiesByAuthorIds(anyList()))
                .thenReturn(List.of(act));
        when(newsRepository.findActivitiesByAuthorIds(anyList()))
                .thenReturn(Collections.emptyList());

        ClubDetailDTO result = service.getClubManagementDetail(1L);

        assertEquals(1L, result.getClubId());
        assertEquals(1, result.getTeams().size());
        assertEquals(1, result.getTeams().get(0).getMembers().size());
        assertEquals(1, result.getTeams().get(0).getActivities().size());
    }

    @Test
    void getClubManagementDetail_notMember_throws() {
        mockCurrentUser(10L, "user@example.com");

        when(clubMembershipRepository.findActiveClubsByUserId(anyLong()))
                .thenReturn(Collections.emptyList());

        assertThrows(ResourceNotFoundException.class,
                () -> service.getClubManagementDetail(1L));
    }

    @Test
    void getUserClubRoles_happyPath() {
        Long userId = 10L;

        User u = new User();
        u.setId(userId);
        u.setIsActive(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(u));

        Semester sem = new Semester();
        sem.setId(5L);
        sem.setIsCurrent(true);
        sem.setStartDate(LocalDate.now().minusDays(1));
        sem.setEndDate(LocalDate.now().plusDays(1));
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(sem));

        Club club = new Club();
        club.setId(1L);
        club.setClubName("CLB Dev");

        ClubMemberShip cms = new ClubMemberShip();
        cms.setId(100L);
        cms.setUser(u);
        cms.setClub(club);
        cms.setStatus(ClubMemberShipStatus.ACTIVE);

        when(clubMembershipRepository.findActiveClubMembershipsByUserId(userId))
                .thenReturn(List.of(cms));

        RoleMemberShip rm = new RoleMemberShip();
        ClubRole cr = new ClubRole();
        cr.setRoleName("Chủ nhiệm");

        SystemRole sr = new SystemRole();
        sr.setRoleName("CLUB_PRESIDENT");
        cr.setSystemRole(sr);

        rm.setClubRole(cr);

        when(roleMembershipRepository.findByClubMemberShipIdAndSemesterIdAndIsActiveWithFetch(
                cms.getId(), sem.getId(), true))
                .thenReturn(List.of(rm));

        List<ClubRoleInfo> roles = service.getUserClubRoles(userId);

        assertEquals(1, roles.size());
        assertEquals("CLB Dev", roles.get(0).getClubName());
        assertEquals("Chủ nhiệm", roles.get(0).getClubRole());
        assertEquals("CLUB_PRESIDENT", roles.get(0).getSystemRole());
    }
}
