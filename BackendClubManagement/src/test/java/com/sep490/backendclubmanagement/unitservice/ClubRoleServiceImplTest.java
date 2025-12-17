package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.request.CreateClubRoleRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateClubRoleRequest;
import com.sep490.backendclubmanagement.dto.response.ClubRoleResponse;
import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.entity.ClubRole;
import com.sep490.backendclubmanagement.entity.SystemRole;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.ClubRoleMapper;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.ClubRoleRepository;
import com.sep490.backendclubmanagement.repository.RoleMemberShipRepository;
import com.sep490.backendclubmanagement.repository.SystemRoleRepository;
import com.sep490.backendclubmanagement.service.ClubRoleServiceImpl;
import com.sep490.backendclubmanagement.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClubRoleServiceImplTest {

    @Mock
    private ClubRoleRepository clubRoleRepository;

    @Mock
    private ClubRoleMapper clubRoleMapper;

    @Mock
    private RoleMemberShipRepository roleMemberShipRepo;

    @Mock
    private ClubRepository clubRepository;

    @Mock
    private SystemRoleRepository systemRoleRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private ClubRoleServiceImpl clubRoleService;

    // ===== helper =====

    private Club sampleClub(Long id) {
        Club c = new Club();
        c.setId(id);
        c.setClubName("Club " + id);
        c.setClubCode("CLB" + id);
        return c;
    }

    private ClubRole sampleRole(Long id, Club club, int level) {
        ClubRole r = new ClubRole();
        r.setId(id);
        r.setRoleName("Role " + id);
        r.setRoleCode("ROLE_" + id);
        r.setRoleLevel(level);
        r.setClub(club);
        return r;
    }

    // ============= getClubRolesByClubId =============

    @Test
    void getClubRolesByClubId_shouldReturnMappedDtos() {
        Long clubId = 1L;
        List<ClubRole> roles = new ArrayList<ClubRole>();
        roles.add(sampleRole(1L, sampleClub(clubId), 3));
        roles.add(sampleRole(2L, sampleClub(clubId), 3));

        List<ClubRoleResponse> dtoList = new ArrayList<ClubRoleResponse>();
        dtoList.add(new ClubRoleResponse());
        dtoList.add(new ClubRoleResponse());

        when(clubRoleRepository.findByClubId(clubId)).thenReturn(roles);
        when(clubRoleMapper.toDtos(roles)).thenReturn(dtoList);

        List<ClubRoleResponse> result = clubRoleService.getClubRolesByClubId(clubId);

        assertEquals(2, result.size());
        verify(clubRoleRepository).findByClubId(clubId);
        verify(clubRoleMapper).toDtos(roles);
    }

    // ============= simple checks =============

    @Test
    void isClubLeaderOrVice_shouldDelegateToRepository() {
        when(roleMemberShipRepo.existsClubAdmin(10L, 1L)).thenReturn(true);

        assertTrue(clubRoleService.isClubLeaderOrVice(10L, 1L));
        verify(roleMemberShipRepo).existsClubAdmin(10L, 1L);
    }

    @Test
    void isTeamLeader_shouldDelegateWithSuffixHead() {
        when(roleMemberShipRepo.existsTeamLeader(10L, 2L, "_HEAD")).thenReturn(true);

        assertTrue(clubRoleService.isTeamLeader(10L, 2L));
        verify(roleMemberShipRepo).existsTeamLeader(10L, 2L, "_HEAD");
    }

    @Test
    void isMemberOfTeam_shouldDelegateToRepository() {
        when(roleMemberShipRepo
                .existsByClubMemberShip_User_IdAndTeam_IdAndSemester_IsCurrentTrue(10L, 2L))
                .thenReturn(true);

        assertTrue(clubRoleService.isMemberOfTeam(10L, 2L));
        verify(roleMemberShipRepo)
                .existsByClubMemberShip_User_IdAndTeam_IdAndSemester_IsCurrentTrue(10L, 2L);
    }

    // ============= createClubRole =============

    @Test
    void createClubRole_notLeader_shouldThrowForbidden() throws AppException {
        Long clubId = 1L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(false);

        CreateClubRoleRequest req = new CreateClubRoleRequest();
        req.setRoleName("Trưởng ban");
        req.setRoleLevel(3);

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.createClubRole(clubId, req));

        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void createClubRole_autoGenerateRoleCode_success() throws AppException {
        Long clubId = 1L;
        Long currentUserId = 10L;

        when(userService.getCurrentUserId()).thenReturn(currentUserId);
        when(roleMemberShipRepo.existsClubAdmin(currentUserId, clubId)).thenReturn(true);

        // Generated code không trùng
        when(clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCase(eq(clubId), anyString()))
                .thenReturn(false);
        when(clubRoleRepository.existsByClubIdAndRoleNameIgnoreCase(clubId, "Trưởng ban Truyền thông"))
                .thenReturn(false);

        Club club = sampleClub(clubId);
        when(clubRepository.findById(clubId)).thenReturn(Optional.of(club));

        when(clubRoleRepository.save(any(ClubRole.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ClubRoleResponse expected = new ClubRoleResponse();
        when(clubRoleMapper.toDto(any(ClubRole.class))).thenReturn(expected);

        CreateClubRoleRequest req = new CreateClubRoleRequest();
        req.setRoleName("Trưởng ban Truyền thông");
        req.setDescription("desc");
        req.setRoleLevel(3);
        // không set roleCode và systemRoleId

        ClubRoleResponse resp = clubRoleService.createClubRole(clubId, req);

        assertSame(expected, resp);

        // bắt entity để xem roleCode
        ArgumentCaptor<ClubRole> captor = ArgumentCaptor.forClass(ClubRole.class);
        verify(clubRoleRepository).save(captor.capture());
        ClubRole saved = captor.getValue();

        assertEquals("TR_ONG_BAN_TRUYEN_THONG", saved.getRoleCode());
        assertEquals("Trưởng ban Truyền thông".trim(), saved.getRoleName());
        assertEquals(Integer.valueOf(3), saved.getRoleLevel());
        assertEquals(club, saved.getClub());
        assertNull(saved.getSystemRole());
    }

    @Test
    void createClubRole_providedRoleCode_duplicate_shouldThrowInvalidInput() throws AppException {
        Long clubId = 1L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        CreateClubRoleRequest req = new CreateClubRoleRequest();
        req.setRoleName("Role");
        req.setRoleCode("CODE1");
        req.setRoleLevel(3);

        when(clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCase(clubId, "CODE1"))
                .thenReturn(true);

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.createClubRole(clubId, req));

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
        verify(clubRoleRepository, never()).save(any());
    }

    @Test
    void createClubRole_duplicateRoleName_shouldThrowInvalidInput() throws AppException {
        Long clubId = 1L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        CreateClubRoleRequest req = new CreateClubRoleRequest();
        req.setRoleName("Role");
        req.setRoleLevel(3);

        when(clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCase(eq(clubId), anyString()))
                .thenReturn(false);
        when(clubRoleRepository.existsByClubIdAndRoleNameIgnoreCase(clubId, "Role"))
                .thenReturn(true);

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.createClubRole(clubId, req));

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
        verify(clubRoleRepository, never()).save(any());
    }

    @Test
    void createClubRole_invalidLevel_shouldThrowInvalidInput() throws AppException  {
        Long clubId = 1L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        CreateClubRoleRequest req = new CreateClubRoleRequest();
        req.setRoleName("Role");
        req.setRoleLevel(1); // <=1

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.createClubRole(clubId, req));

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
    }

    @Test
    void createClubRole_clubNotFound_shouldThrowNotFound() throws AppException {
        Long clubId = 1L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        CreateClubRoleRequest req = new CreateClubRoleRequest();
        req.setRoleName("Role");
        req.setRoleLevel(3);

        when(clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCase(eq(clubId), anyString()))
                .thenReturn(false);
        when(clubRoleRepository.existsByClubIdAndRoleNameIgnoreCase(eq(clubId), anyString()))
                .thenReturn(false);
        when(clubRepository.findById(clubId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.createClubRole(clubId, req));

        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
    }

    @Test
    void createClubRole_systemRoleNotFound_shouldThrowNotFound()throws AppException  {
        Long clubId = 1L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        CreateClubRoleRequest req = new CreateClubRoleRequest();
        req.setRoleName("Role");
        req.setRoleLevel(3);
        req.setSystemRoleId(99L);

        when(clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCase(eq(clubId), anyString()))
                .thenReturn(false);
        when(clubRoleRepository.existsByClubIdAndRoleNameIgnoreCase(eq(clubId), anyString()))
                .thenReturn(false);
        when(clubRepository.findById(clubId))
                .thenReturn(Optional.of(sampleClub(clubId)));
        when(systemRoleRepository.findById(99L)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.createClubRole(clubId, req));

        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
    }

    // ============= updateClubRole =============

    @Test
    void updateClubRole_notLeader_shouldThrowForbidden() throws AppException  {
        Long clubId = 1L;
        Long roleId = 2L;

        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(false);

        UpdateClubRoleRequest req = new UpdateClubRoleRequest();
        req.setRoleName("New");
        req.setRoleCode("NEW");
        req.setRoleLevel(3);

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.updateClubRole(clubId, roleId, req));

        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void updateClubRole_roleNotFound_shouldThrowNotFound() throws AppException  {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.empty());

        UpdateClubRoleRequest req = new UpdateClubRoleRequest();
        req.setRoleName("New");
        req.setRoleCode("NEW");
        req.setRoleLevel(3);

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.updateClubRole(clubId, roleId, req));

        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
    }

    @Test
    void updateClubRole_roleOfAnotherClub_shouldThrowForbidden() throws AppException {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        Club otherClub = sampleClub(99L);
        ClubRole role = sampleRole(roleId, otherClub, 3);
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.of(role));

        UpdateClubRoleRequest req = new UpdateClubRoleRequest();
        req.setRoleName("New");
        req.setRoleCode("NEW");
        req.setRoleLevel(3);

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.updateClubRole(clubId, roleId, req));

        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void updateClubRole_duplicateRoleCode_shouldThrowInvalidInput() throws AppException  {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        Club club = sampleClub(clubId);
        ClubRole role = sampleRole(roleId, club, 3);
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.of(role));

        UpdateClubRoleRequest req = new UpdateClubRoleRequest();
        req.setRoleName("New");
        req.setRoleCode("NEW");
        req.setRoleLevel(3);

        when(clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCaseAndIdNot(
                clubId, "NEW", roleId)).thenReturn(true);

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.updateClubRole(clubId, roleId, req));

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
    }

    @Test
    void updateClubRole_duplicateRoleName_shouldThrowInvalidInput() throws AppException  {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        Club club = sampleClub(clubId);
        ClubRole role = sampleRole(roleId, club, 3);
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.of(role));

        UpdateClubRoleRequest req = new UpdateClubRoleRequest();
        req.setRoleName("New");
        req.setRoleCode("NEW");
        req.setRoleLevel(3);

        when(clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCaseAndIdNot(
                clubId, "NEW", roleId)).thenReturn(false);
        when(clubRoleRepository.existsByClubIdAndRoleNameIgnoreCaseAndIdNot(
                clubId, "New", roleId)).thenReturn(true);

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.updateClubRole(clubId, roleId, req));

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
    }

    @Test
    void updateClubRole_invalidLevel_shouldThrowInvalidInput() throws AppException {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        Club club = sampleClub(clubId);
        ClubRole role = sampleRole(roleId, club, 3);
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.of(role));

        UpdateClubRoleRequest req = new UpdateClubRoleRequest();
        req.setRoleName("New");
        req.setRoleCode("NEW");
        req.setRoleLevel(1); // invalid

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.updateClubRole(clubId, roleId, req));

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
    }

    @Test
    void updateClubRole_success_withSystemRole() throws AppException {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        Club club = sampleClub(clubId);
        ClubRole role = sampleRole(roleId, club, 3);
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.of(role));

        when(clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCaseAndIdNot(
                clubId, "NEW", roleId)).thenReturn(false);
        when(clubRoleRepository.existsByClubIdAndRoleNameIgnoreCaseAndIdNot(
                clubId, "New", roleId)).thenReturn(false);

        SystemRole sr = new SystemRole();
        sr.setId(5L);
        sr.setRoleName("SYS");
        when(systemRoleRepository.findById(5L)).thenReturn(Optional.of(sr));

        when(clubRoleRepository.save(any(ClubRole.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ClubRoleResponse expected = new ClubRoleResponse();
        when(clubRoleMapper.toDto(any(ClubRole.class))).thenReturn(expected);

        UpdateClubRoleRequest req = new UpdateClubRoleRequest();
        req.setRoleName("New");
        req.setRoleCode("NEW");
        req.setDescription("desc");
        req.setRoleLevel(4);
        req.setSystemRoleId(5L);

        ClubRoleResponse resp = clubRoleService.updateClubRole(clubId, roleId, req);

        assertSame(expected, resp);
        assertEquals("New", role.getRoleName());
        assertEquals("NEW", role.getRoleCode());
        assertEquals(Integer.valueOf(4), role.getRoleLevel());
        assertEquals(sr, role.getSystemRole());
    }

    // ============= deleteClubRole =============

    @Test
    void deleteClubRole_notLeader_shouldThrowForbidden() throws AppException {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.deleteClubRole(clubId, roleId));

        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        verify(clubRoleRepository, never()).delete(any());
    }

    @Test
    void deleteClubRole_roleNotFound_shouldThrowNotFound() throws AppException  {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.deleteClubRole(clubId, roleId));

        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
    }

    @Test
    void deleteClubRole_roleOfAnotherClub_shouldThrowForbidden() throws AppException {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        Club otherClub = sampleClub(99L);
        ClubRole role = sampleRole(roleId, otherClub, 3);
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.of(role));

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.deleteClubRole(clubId, roleId));

        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        verify(clubRoleRepository, never()).delete(any());
    }

    @Test
    void deleteClubRole_levelTooLow_shouldThrowInvalidInput() throws AppException {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        Club club = sampleClub(clubId);
        ClubRole role = sampleRole(roleId, club, 1); // level <=1
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.of(role));

        AppException ex = assertThrows(AppException.class,
                () -> clubRoleService.deleteClubRole(clubId, roleId));

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
        verify(clubRoleRepository, never()).delete(any());
    }

    @Test
    void deleteClubRole_success_shouldDeleteRole() throws AppException {
        Long clubId = 1L, roleId = 2L;
        when(userService.getCurrentUserId()).thenReturn(10L);
        when(roleMemberShipRepo.existsClubAdmin(10L, clubId)).thenReturn(true);

        Club club = sampleClub(clubId);
        ClubRole role = sampleRole(roleId, club, 3);
        when(clubRoleRepository.findById(roleId)).thenReturn(Optional.of(role));

        clubRoleService.deleteClubRole(clubId, roleId);

        verify(clubRoleRepository).delete(role);
    }
}
