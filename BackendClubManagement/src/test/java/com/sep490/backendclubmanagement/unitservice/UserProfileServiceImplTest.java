package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.request.UpdateUserProfileRequest;
import com.sep490.backendclubmanagement.dto.response.UserProfileResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import com.sep490.backendclubmanagement.service.CloudinaryService;
import com.sep490.backendclubmanagement.service.SemesterService;
import com.sep490.backendclubmanagement.service.UserProfileServiceImpl;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ClubMemberShipRepository clubMemberShipRepository;

    @Mock
    private CloudinaryService cloudinaryService;

    @Mock
    private SemesterService semesterService;

    @InjectMocks
    private UserProfileServiceImpl userProfileService;

    // ====== helper tạo User + membership ======

    private User sampleUser(Long id, boolean withSystemRole) {
        User u = new User();
        u.setId(id);
        u.setEmail("user" + id + "@mail.com");
        u.setFullName("User " + id);
        u.setPhoneNumber("0123456789");
        u.setStudentCode("SE" + id);
        u.setDateOfBirth(LocalDate.of(2000, 1, 1));
        u.setGender("MALE");
        u.setAvatarUrl("http://avatar");
        u.setIsActive(true);

        if (withSystemRole) {
            SystemRole sr = new SystemRole();
            sr.setId(1L);
            sr.setRoleName("ADMIN");
            u.setSystemRole(sr);
        }

        return u;
    }



    private ClubMemberShip sampleMembership(Long membershipId) {
        Club club = new Club();
        club.setId(10L);
        club.setClubName("Club 10");
        club.setClubCode("CLB10");
        club.setLogoUrl("http://logo");
        club.setStatus("ACTIVE");
        club.setFeatured(true);

        ClubRole clubRole = new ClubRole();
        clubRole.setId(100L);
        clubRole.setRoleName("President");
        clubRole.setRoleCode("PRES");
        clubRole.setRoleLevel(1);

        Team team = new Team();
        team.setId(20L);
        team.setTeamName("Media");

        Semester semester = new Semester();
        semester.setId(30L);
        semester.setSemesterName("Fall 2025");
        semester.setIsCurrent(true);

        RoleMemberShip rms = new RoleMemberShip();
        rms.setId(200L);
        rms.setClubRole(clubRole);
        rms.setTeam(team);
        rms.setSemester(semester);
        rms.setIsActive(true);

        ClubMemberShip cms = new ClubMemberShip();
        cms.setId(membershipId);
        cms.setClub(club);
        cms.setStatus(ClubMemberShipStatus.ACTIVE);

        // ✅ Dùng Set thay vì List
        Set<RoleMemberShip> roleMemberships = new HashSet<>();
        roleMemberships.add(rms);
        cms.setRoleMemberships(roleMemberships);

        return cms;
    }



    // ========== getUserProfile ==========

    @Test
    void getUserProfile_success_shouldMapAllFields() throws AppException {
        Long userId = 1L;
        User user = sampleUser(userId, true);
        ClubMemberShip membership = sampleMembership(1000L);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(semesterService.getCurrentSemester()).thenReturn(new Semester());
        when(clubMemberShipRepository.findByUserIdWithRoles(
                eq(userId),
                eq(ClubMemberShipStatus.ACTIVE),
                isNull(),
                eq(true)
        )).thenReturn(List.of(membership));

        UserProfileResponse resp = userProfileService.getUserProfile(userId);

        assertEquals(userId, resp.getId());
        assertEquals("user1@mail.com", resp.getEmail());
        assertEquals("User 1", resp.getFullName());
        assertEquals("0123456789", resp.getPhoneNumber());
        assertEquals("SE1", resp.getStudentCode());
        assertEquals("ADMIN", resp.getSystemRoleName());
        assertEquals(1L, resp.getSystemRoleId());
        assertEquals(1, resp.getClubMemberships().size());

        var clubDto = resp.getClubMemberships().get(0);
        assertEquals(membership.getId(), clubDto.getClubMembershipId());
        assertEquals(10L, clubDto.getClubId());
        assertEquals("Club 10", clubDto.getClubName());
        assertEquals("CLB10", clubDto.getClubCode());
        assertEquals(1, clubDto.getRoles().size());

        var roleDto = clubDto.getRoles().get(0);
        assertEquals(200L, roleDto.getRoleMembershipId());
        assertEquals(100L, roleDto.getClubRoleId());
        assertEquals("President", roleDto.getClubRoleName());
        assertEquals("PRES", roleDto.getClubRoleCode());
        assertEquals(1, roleDto.getClubRoleLevel());
        assertEquals(20L, roleDto.getTeamId());
        assertEquals("Media", roleDto.getTeamName());
        assertEquals(30L, roleDto.getSemesterId());
        assertEquals("Fall 2025", roleDto.getSemesterName());
        assertTrue(roleDto.getSemesterIsCurrent());
        assertTrue(roleDto.getIsActive());
    }

    @Test
    void getUserProfile_userNotFound_shouldThrowAppException() {
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> userProfileService.getUserProfile(userId));

        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
    }

    // ========== updateUserProfile ==========

    @Test
    void updateUserProfile_success_shouldUpdateFieldsAndReturnProfile() throws AppException {
        Long userId = 1L;
        User user = sampleUser(userId, false); // systemRole null

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(semesterService.getCurrentSemester()).thenReturn(new Semester());
        when(clubMemberShipRepository.findByUserIdWithRoles(
                eq(userId),
                eq(ClubMemberShipStatus.ACTIVE),
                isNull(),
                eq(true)
        )).thenReturn(Collections.emptyList());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateUserProfileRequest req = new UpdateUserProfileRequest();
        req.setFullName("  New Name  "); // có trim
        req.setPhoneNumber("0987654321");
        req.setStudentCode("NEWCODE");
        req.setDateOfBirth(LocalDate.of(1999, 12, 31));
        req.setGender("FEMALE");

        UserProfileResponse resp = userProfileService.updateUserProfile(userId, req);

        // check đã update
        assertEquals("New Name", user.getFullName());
        assertEquals("0987654321", user.getPhoneNumber());
        assertEquals("NEWCODE", user.getStudentCode());
        assertEquals(LocalDate.of(1999, 12, 31), user.getDateOfBirth());
        assertEquals("FEMALE", user.getGender());

        // check response lấy từ getUserProfile
        assertEquals("New Name", resp.getFullName());
        assertNull(resp.getSystemRoleId());
        assertNull(resp.getSystemRoleName());

        verify(userRepository, atLeastOnce()).save(user);
    }

    @Test
    void updateUserProfile_invalidFullName_shouldThrow() {
        Long userId = 1L;
        User user = sampleUser(userId, false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UpdateUserProfileRequest req = new UpdateUserProfileRequest();
        req.setFullName("   "); // chỉ toàn space

        AppException ex = assertThrows(AppException.class,
                () -> userProfileService.updateUserProfile(userId, req));

        assertEquals(ErrorCode.INVALID_FULL_NAME, ex.getErrorCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUserProfile_invalidPhoneNumber_shouldThrow() {
        Long userId = 1L;
        User user = sampleUser(userId, false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UpdateUserProfileRequest req = new UpdateUserProfileRequest();
        req.setPhoneNumber("12345"); // sai regex

        AppException ex = assertThrows(AppException.class,
                () -> userProfileService.updateUserProfile(userId, req));

        assertEquals(ErrorCode.INVALID_PHONE_NUMBER, ex.getErrorCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUserProfile_futureDateOfBirth_shouldThrow() {
        Long userId = 1L;
        User user = sampleUser(userId, false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UpdateUserProfileRequest req = new UpdateUserProfileRequest();
        req.setDateOfBirth(LocalDate.now().plusDays(1));

        AppException ex = assertThrows(AppException.class,
                () -> userProfileService.updateUserProfile(userId, req));

        assertEquals(ErrorCode.INVALID_DATE_OF_BIRTH, ex.getErrorCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUserProfile_userNotFound_shouldThrow() {
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        UpdateUserProfileRequest req = new UpdateUserProfileRequest();
        req.setFullName("Someone");

        AppException ex = assertThrows(AppException.class,
                () -> userProfileService.updateUserProfile(userId, req));

        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
    }

    // ========== updateUserAvatar ==========

    @Test
    void updateUserAvatar_invalidFile_shouldThrow() {
        Long userId = 1L;
        MultipartFile emptyFile = mock(MultipartFile.class);
        when(emptyFile.isEmpty()).thenReturn(true);

        AppException ex = assertThrows(AppException.class,
                () -> userProfileService.updateUserAvatar(userId, emptyFile));

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
        verifyNoInteractions(userRepository, cloudinaryService, clubMemberShipRepository, semesterService);
    }

    @Test
    void updateUserAvatar_userNotFound_shouldThrow() {
        Long userId = 1L;
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);

        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> userProfileService.updateUserAvatar(userId, file));

        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
        verify(cloudinaryService, never()).uploadImage(any(), anyString());
    }

    @Test
    void updateUserAvatar_success_shouldUploadAndReturnProfile() throws AppException {
        Long userId = 1L;
        User user = sampleUser(userId, false);

        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // ⭐ Không new UploadResult, mà mock nó
        CloudinaryService.UploadResult uploadResult = mock(CloudinaryService.UploadResult.class);
        when(uploadResult.url()).thenReturn("http://new-avatar");

        when(cloudinaryService.uploadImage(file, "users/avatars"))
                .thenReturn(uploadResult);

        // stub cho getUserProfile() được gọi sau khi update
        when(semesterService.getCurrentSemester()).thenReturn(new Semester());
        when(clubMemberShipRepository.findByUserIdWithRoles(
                eq(userId),
                eq(ClubMemberShipStatus.ACTIVE),
                isNull(),
                eq(true)
        )).thenReturn(Collections.emptyList());

        var resp = userProfileService.updateUserAvatar(userId, file);

        assertEquals("http://new-avatar", user.getAvatarUrl());
        assertEquals("http://new-avatar", resp.getAvatarUrl());

        verify(cloudinaryService).uploadImage(file, "users/avatars");
        verify(userRepository, atLeastOnce()).save(user);
    }

}
