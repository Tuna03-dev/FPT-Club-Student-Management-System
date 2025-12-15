package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.UpdateUserProfileRequest;
import com.sep490.backendclubmanagement.dto.response.ClubMembershipProfileResponse;
import com.sep490.backendclubmanagement.dto.response.RoleInClubResponse;
import com.sep490.backendclubmanagement.dto.response.UserProfileResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserProfileServiceImpl implements UserProfileService {

    private final UserRepository userRepository;
    private final ClubMemberShipRepository clubMemberShipRepository;
    private final CloudinaryService cloudinaryService;
    private final SemesterService semesterService;   // 👈 thêm vào


    @Override
    public UserProfileResponse getUserProfile(Long userId) throws AppException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Semester currentSemester = semesterService.getCurrentSemester();
        List<ClubMemberShip> memberships =
                clubMemberShipRepository.findByUserIdWithRoles(
                        userId,
                        ClubMemberShipStatus.ACTIVE,
                        null,
                        true // isActive của RoleMembership
                );

        List<ClubMembershipProfileResponse> clubDtos = memberships.stream()
                .map(this::mapToClubMembershipProfile)
                .toList();
        SystemRole systemRole = user.getSystemRole();

        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .studentCode(user.getStudentCode())
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender())
                .avatarUrl(user.getAvatarUrl())
                .isActive(user.getIsActive())
                .systemRoleId(systemRole != null ? systemRole.getId() : null)
                .systemRoleName(systemRole != null ? systemRole.getRoleName() : null)
                .clubMemberships(clubDtos)
                .build();
    }

    @Override
    @Transactional
    public UserProfileResponse updateUserProfile(Long userId,
                                                 UpdateUserProfileRequest request) throws AppException {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Chỉ set khi client truyền lên (tránh override thành null)
        if (request.getFullName() != null) {
            String fullName = request.getFullName().trim();
            if (fullName.isEmpty()) {
                // nhớ khai báo thêm mã lỗi tương ứng trong ErrorCode
                throw new AppException(ErrorCode.INVALID_FULL_NAME);
            }
            user.setFullName(fullName);
        }
        if (request.getPhoneNumber() != null) {
            String phone = request.getPhoneNumber().trim();

            // ví dụ: số Việt Nam 10 chữ số, bắt đầu bằng 0
            // bạn có thể chỉnh regex này cho đúng rule hệ thống của bạn
            if (!phone.matches("^0\\d{9}$")) {
                throw new AppException(ErrorCode.INVALID_PHONE_NUMBER);
            }

            user.setPhoneNumber(phone);
        }
        if (request.getStudentCode() != null) {
            user.setStudentCode(request.getStudentCode());
        }

        if (request.getDateOfBirth() != null) {
            // Không cho phép ngày sinh trong tương lai
            if (request.getDateOfBirth().isAfter(LocalDate.now())) {
                throw new AppException(ErrorCode.INVALID_DATE_OF_BIRTH);
            }
            user.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }


        userRepository.save(user);

        // Tái sử dụng hàm getUserProfile để build response đầy đủ
        return getUserProfile(userId);
    }

    // 👉 NEW: update avatar bằng Cloudinary + file
    @Override
    @Transactional
    public UserProfileResponse updateUserAvatar(Long userId,
                                                MultipartFile avatarFile) throws AppException {
        if (avatarFile == null || avatarFile.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // upload lên Cloudinary, dùng folder riêng cho avatar
        CloudinaryService.UploadResult uploadResult =
                cloudinaryService.uploadImage(avatarFile, "users/avatars");

        // set URL mới
        user.setAvatarUrl(uploadResult.url());
        userRepository.save(user);

        // trả về profile sau khi update avatar
        return getUserProfile(userId);
    }

    private ClubMembershipProfileResponse mapToClubMembershipProfile(ClubMemberShip cms ) {
        Club club = cms.getClub();

        List<RoleInClubResponse> roles = cms.getRoleMemberships().stream()
                .map(rms -> {
                    ClubRole clubRole = rms.getClubRole();
                    Team team = rms.getTeam();
                    Semester semester = rms.getSemester();
                    return RoleInClubResponse.builder()
                            .roleMembershipId(rms.getId())
                            .clubRoleId(clubRole != null ? clubRole.getId() : null)
                            .clubRoleName(clubRole != null ? clubRole.getRoleName() : null)
                            .clubRoleCode(clubRole != null ? clubRole.getRoleCode() : null)
                            .clubRoleLevel(clubRole != null ? clubRole.getRoleLevel() : null)
                            .teamId(team != null ? team.getId() : null)
                            .teamName(team != null ? team.getTeamName() : null)
                            .semesterId(semester != null ? semester.getId() : null)
                            .semesterName(semester != null ? semester.getSemesterName() : null)
                            .semesterIsCurrent(semester != null ? semester.getIsCurrent() : null)
                            .isActive(rms.getIsActive())
                            .build();
                })
                .toList();

        return ClubMembershipProfileResponse.builder()
                .clubMembershipId(cms.getId())
                .clubId(club.getId())
                .clubName(club.getClubName())
                .clubCode(club.getClubCode())
                .clubLogoUrl(club.getLogoUrl())
                .clubStatus(club.getStatus())
                .clubFeatured(club.isFeatured())
                .joinDate(cms.getJoinDate())
                .endDate(cms.getEndDate())
                .membershipStatus(cms.getStatus())
                .roles(roles)
                .build();
    }


}
