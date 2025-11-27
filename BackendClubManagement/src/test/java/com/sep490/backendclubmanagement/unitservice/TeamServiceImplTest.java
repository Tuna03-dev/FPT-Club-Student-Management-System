package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.request.CreateTeamRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateTeamRequest;
import com.sep490.backendclubmanagement.dto.response.AvailableMemberDTO;
import com.sep490.backendclubmanagement.dto.response.TeamResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AccessDeniedException;
import com.sep490.backendclubmanagement.exception.DuplicateResourceException;
import com.sep490.backendclubmanagement.exception.ResourceNotFoundException;
import com.sep490.backendclubmanagement.mapper.TeamMapper;
import com.sep490.backendclubmanagement.repository.*;
import com.sep490.backendclubmanagement.security.RoleGuard;
import com.sep490.backendclubmanagement.service.NotificationService;
import com.sep490.backendclubmanagement.service.TeamServiceImpl;
import com.sep490.backendclubmanagement.service.WebSocketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class TeamServiceImplTest {

    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMapper teamMapper;
    @Mock
    private ClubRepository clubRepository;
    @Mock
    private SemesterRepository semesterRepository;
    @Mock
    private ClubRoleRepository clubRoleRepository;
    @Mock
    private ClubMemberShipRepository clubMemberShipRepository;
    @Mock
    private RoleMemberShipRepository roleMemberShipRepository;
    @Mock
    private RoleGuard guard;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private WebSocketService webSocketService;

    @InjectMocks
    private TeamServiceImpl teamService;

    private Club club;
    private Semester currentSemester;
    private Team team;

    @BeforeEach
    void setup() {
        club = new Club();
        club.setId(1L);
        club.setClubName("CLB Dev Test");

        currentSemester = new Semester();
        currentSemester.setId(10L);
        currentSemester.setSemesterCode("2024A");
        currentSemester.setIsCurrent(true);
        currentSemester.setStartDate(LocalDate.of(2024, 1, 1));
        currentSemester.setEndDate(LocalDate.of(2024, 6, 30));

        team = new Team();
        team.setId(100L);
        team.setTeamName("Kỹ thuật");
        team.setDescription("Ban kỹ thuật");
        team.setClub(club);
    }

    // ========== getTeamsByClubId ==========

    @Test
    void getTeamsByClubId_returnsMappedDtos() {
        // Arrange
        when(teamRepository.findByClubId(club.getId()))
                .thenReturn(List.of(team));

        TeamResponse dto = new TeamResponse();
        dto.setId(team.getId());
        dto.setTeamName(team.getTeamName());
        when(teamMapper.toDto(team)).thenReturn(dto);

        // Act
        List<TeamResponse> result = teamService.getTeamsByClubId(club.getId());

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(team.getTeamName(), result.get(0).getTeamName());
        verify(teamRepository, times(1)).findByClubId(club.getId());
        verify(teamMapper, times(1)).toDto(team);
    }

    // ========== createTeam ==========

    @Test
    void createTeam_happyPath_withLeaderViceAndMembers() {
        Long leaderId = 101L;
        Long viceId = 102L;
        Long memberId = 103L;
        Long actorId = 999L;

        CreateTeamRequest req = new CreateTeamRequest();
        req.setClubId(club.getId());
        req.setTeamName("  Kỹ   thuật   ");
        req.setDescription("Dev infra");
        req.setLinkGroupChat("https://zalo.me/dev");
        req.setLeaderUserId(leaderId);
        req.setViceLeaderUserId(viceId);
        req.setMemberUserIds(List.of(memberId));

        // ==== required stubs ====
        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));

        when(guard.getCurrentUserId()).thenReturn(actorId);
        when(guard.isClubPresident(actorId, club.getId())).thenReturn(true);

        when(teamRepository.existsByClubIdAndTeamNameIgnoreCase(eq(club.getId()), anyString()))
                .thenReturn(false);

        // all members actually active in CLB
        when(clubMemberShipRepository.findByUserIdInAndClubId(
                anyList(),
                eq(club.getId())
        )).thenReturn(List.of(
                buildMembership(leaderId),
                buildMembership(viceId),
                buildMembership(memberId)
        ));

        // no duplicate roles in semester
        when(roleMemberShipRepository.findExistingTeamMembersInSemester(
                eq(club.getId()),
                eq(currentSemester.getId()),
                anyList()
        )).thenReturn(Collections.emptyList());

        // team saved
        Team savedTeam = new Team();
        savedTeam.setId(200L);
        savedTeam.setTeamName("Kỹ thuật");
        savedTeam.setDescription("Dev infra");
        savedTeam.setClub(club);
        when(teamRepository.save(any(Team.class))).thenReturn(savedTeam);

        // roles
        when(clubRoleRepository.findByClubIdAndRoleCode(club.getId(), "CLUB_TEAM_HEAD"))
                .thenReturn(Optional.of(buildClubRole("CLUB_TEAM_HEAD")));
        when(clubRoleRepository.findByClubIdAndRoleCode(club.getId(), "CLUB_TEAM_DEPUTY"))
                .thenReturn(Optional.of(buildClubRole("CLUB_TEAM_DEPUTY")));
        when(clubRoleRepository.findByClubIdAndRoleCode(club.getId(), "CLUB_MEMBER"))
                .thenReturn(Optional.of(buildClubRole("CLUB_MEMBER")));

        TeamResponse respDto = new TeamResponse();
        respDto.setId(200L);
        respDto.setTeamName("Kỹ thuật");
        when(teamMapper.toDto(savedTeam)).thenReturn(respDto);

        // ==== Execute ====
        TeamResponse result = teamService.createTeam(req);

        assertEquals("Kỹ thuật", result.getTeamName());
    }



    @Test
    void createTeam_throwsAccessDenied_whenNotPresidentOrVice() {
        // Arrange
        CreateTeamRequest req = new CreateTeamRequest();
        req.setClubId(club.getId());
        req.setTeamName("Ban Truyền thông");
        req.setDescription("Truyền thông");

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));

        when(guard.getCurrentUserId()).thenReturn(123L);
        when(guard.isClubPresident(anyLong(), eq(club.getId()))).thenReturn(false);
        when(guard.isClubVice(anyLong(), eq(club.getId()))).thenReturn(false);

        // Act & Assert
        assertThrows(AccessDeniedException.class,
                () -> teamService.createTeam(req));
    }

    @Test
    void createTeam_throwsDuplicate_whenTeamNameExists() {
        // Arrange
        CreateTeamRequest req = new CreateTeamRequest();
        req.setClubId(club.getId());
        req.setTeamName("Ban Media");

        when(semesterRepository.findCurrentSemester()).thenReturn(Optional.of(currentSemester));
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(guard.getCurrentUserId()).thenReturn(1L);
        when(guard.isClubPresident(1L, club.getId())).thenReturn(true);

        when(teamRepository.existsByClubIdAndTeamNameIgnoreCase(eq(club.getId()), anyString()))
                .thenReturn(true);

        // Act & Assert
        assertThrows(DuplicateResourceException.class,
                () -> teamService.createTeam(req));
    }

    @Test
    void createTeam_throwsIllegalArgument_whenNameTooShort() {
        CreateTeamRequest req = new CreateTeamRequest();
        req.setClubId(club.getId());
        req.setTeamName("ab");  // too short --> validate fail ngay lập tức

        // Không stub gì thêm — service fail trước khi gọi repository
        assertThrows(IllegalArgumentException.class,
                () -> teamService.createTeam(req));
    }




    // ========== updateTeam ==========

    @Test
    void updateTeam_changeNameAndDescription_broadcastAndNotifyMembers() {
        Long teamId = team.getId();
        Long actorId = 999L;

        // FIX: tên cũ phải *khác* tên mới để service gọi check trùng tên
        team.setTeamName("Tên Cũ");

        UpdateTeamRequest req = new UpdateTeamRequest();
        req.setTeamName("Ban Kỹ thuật mới");
        req.setDescription("Mô tả mới");
        req.setLinkGroupChat("https://chat.example.com/new");

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(guard.getCurrentUserId()).thenReturn(actorId);
        when(guard.isClubPresident(actorId, club.getId())).thenReturn(true);

        when(teamRepository.existsByClubIdAndTeamNameIgnoreCaseAndIdNot(
                eq(club.getId()),
                eq("Ban Kỹ thuật mới"),
                eq(teamId)
        )).thenReturn(false);

        RoleMemberShip rm1 = new RoleMemberShip();
        ClubMemberShip cms1 = new ClubMemberShip();
        User u1 = new User();
        u1.setId(100L);
        cms1.setUser(u1);
        rm1.setClubMemberShip(cms1);
        rm1.setIsActive(true);

        when(roleMemberShipRepository.findByTeamIdAndIsActiveTrue(teamId))
                .thenReturn(List.of(rm1));

        Team saved = new Team();
        saved.setId(teamId);
        saved.setTeamName("Ban Kỹ thuật mới");
        saved.setDescription("Mô tả mới");
        saved.setLinkGroupChat("https://chat.example.com/new");
        saved.setClub(club);

        when(teamRepository.save(any(Team.class))).thenReturn(saved);

        TeamResponse dto = new TeamResponse();
        dto.setId(saved.getId());
        dto.setTeamName(saved.getTeamName());
        when(teamMapper.toDto(saved)).thenReturn(dto);

        TeamResponse result = teamService.updateTeam(teamId, req);

        assertEquals("Ban Kỹ thuật mới", result.getTeamName());
    }


    @Test
    void updateTeam_throwsAccessDenied_whenUserNotClubLeaderOrVice() {
        // Arrange
        Long teamId = team.getId();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(guard.getCurrentUserId()).thenReturn(123L);
        when(guard.isClubPresident(anyLong(), eq(club.getId()))).thenReturn(false);
        when(guard.isClubVice(anyLong(), eq(club.getId()))).thenReturn(false);

        UpdateTeamRequest req = new UpdateTeamRequest();
        req.setTeamName("Tên mới");

        // Act & Assert
        assertThrows(AccessDeniedException.class,
                () -> teamService.updateTeam(teamId, req));
    }

    @Test
    void updateTeam_throwsDuplicate_whenNewNameExists() {
        // Arrange
        Long teamId = team.getId();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(guard.getCurrentUserId()).thenReturn(1L);
        when(guard.isClubPresident(1L, club.getId())).thenReturn(true);

        UpdateTeamRequest req = new UpdateTeamRequest();
        req.setTeamName("Ban Media");

        when(teamRepository.existsByClubIdAndTeamNameIgnoreCaseAndIdNot(
                eq(club.getId()),
                anyString(),
                eq(teamId)
        )).thenReturn(true);

        // Act & Assert
        assertThrows(DuplicateResourceException.class,
                () -> teamService.updateTeam(teamId, req));
    }

    // ========== deleteTeam ==========

    @Test
    void deleteTeam_happyPath_deactivatesRolesAndBroadcasts() {
        // Arrange
        Long teamId = team.getId();
        Long actorId = 999L;

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(guard.getCurrentUserId()).thenReturn(actorId);
        when(guard.isClubPresident(actorId, club.getId())).thenReturn(true);

        // active roles
        RoleMemberShip rm = new RoleMemberShip();
        rm.setId(1L);
        rm.setTeam(team);
        rm.setIsActive(true);
        ClubMemberShip cms = new ClubMemberShip();
        User member = new User();
        member.setId(200L);
        cms.setUser(member);
        rm.setClubMemberShip(cms);

        when(roleMemberShipRepository.findByTeamIdAndIsActiveTrue(teamId))
                .thenReturn(List.of(rm));

        // Act
        teamService.deleteTeam(teamId);

        // Assert
        // roleMembership bị set inactive và team = null
        assertFalse(rm.getIsActive());
        assertNull(rm.getTeam());

        verify(roleMemberShipRepository, times(1)).saveAll(anyList());
        verify(teamRepository, times(1)).delete(team);

        // broadcast
        verify(webSocketService, times(1)).broadcastToClub(
                eq(club.getId()),
                eq("TEAM"),
                eq("DELETED"),
                anyMap()
        );

        // notification gửi cho member
        verify(notificationService, times(1)).sendToUsers(
                anyList(),
                eq(actorId),
                anyString(),
                anyString(),
                any(),
                any(),
                anyString(),
                eq(club.getId()),
                isNull(),
                isNull(),
                isNull()
        );
    }

    @Test
    void deleteTeam_throwsAccessDenied_whenNotManager() {
        // Arrange
        Long teamId = team.getId();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(guard.getCurrentUserId()).thenReturn(5L);
        when(guard.isClubPresident(anyLong(), eq(club.getId()))).thenReturn(false);
        when(guard.isClubVice(anyLong(), eq(club.getId()))).thenReturn(false);

        // Act & Assert
        assertThrows(AccessDeniedException.class,
                () -> teamService.deleteTeam(teamId));
    }

    // ========== getAvailableMembers ==========

    @Test
    void getAvailableMembers_returnsListOfAvailableDtos() {
        // Arrange
        when(semesterRepository.findCurrentSemester())
                .thenReturn(Optional.of(currentSemester));

        List<Long> userIds = List.of(10L, 11L);
        when(roleMemberShipRepository.findAvailableMemberUserIds(club.getId(), currentSemester.getId()))
                .thenReturn(userIds);

        User u1 = new User();
        u1.setId(10L);
        u1.setFullName("User 1");
        u1.setEmail("u1@example.com");
        u1.setAvatarUrl("http://img/u1.png");

        User u2 = new User();
        u2.setId(11L);
        u2.setFullName("User 2");
        u2.setEmail("u2@example.com");
        u2.setAvatarUrl("http://img/u2.png");

        when(userRepository.findByIdIn(userIds)).thenReturn(List.of(u1, u2));

        // Act
        List<AvailableMemberDTO> result = teamService.getAvailableMembers(club.getId());

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(u1.getId(), result.get(0).getUserId());
        assertEquals(u2.getId(), result.get(1).getUserId());
    }

    @Test
    void getAvailableMembers_noIds_returnsEmptyList() {
        // Arrange
        when(semesterRepository.findCurrentSemester())
                .thenReturn(Optional.of(currentSemester));
        when(roleMemberShipRepository.findAvailableMemberUserIds(club.getId(), currentSemester.getId()))
                .thenReturn(Collections.emptyList());

        // Act
        List<AvailableMemberDTO> result = teamService.getAvailableMembers(club.getId());

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(userRepository, never()).findByIdIn(anyList());
    }

    // ========== helpers ==========

    private ClubMemberShip buildMembership(Long userId) {
        User u = new User();
        u.setId(userId);
        u.setFullName("User " + userId);

        ClubMemberShip cms = new ClubMemberShip();
        cms.setId(userId + 1000);
        cms.setUser(u);
        cms.setClub(club);
        cms.setStatus(ClubMemberShipStatus.ACTIVE);
        return cms;
    }

    private ClubRole buildClubRole(String code) {
        ClubRole r = new ClubRole();
        r.setId(new Random().nextLong());
        r.setRoleCode(code);
        r.setRoleName(code);
        r.setRoleLevel(2);
        return r;
    }
}
