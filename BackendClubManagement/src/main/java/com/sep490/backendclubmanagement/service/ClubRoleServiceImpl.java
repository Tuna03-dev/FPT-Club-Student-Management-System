package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateClubRoleRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateClubRoleRequest;
import com.sep490.backendclubmanagement.dto.response.ClubRoleResponse;
import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.entity.ClubRole;
import com.sep490.backendclubmanagement.entity.SystemRole;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.repository.*;
import com.sep490.backendclubmanagement.mapper.ClubRoleMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubRoleServiceImpl implements ClubRoleService {

    private final ClubRoleRepository clubRoleRepository;
    private final ClubRoleMapper clubRoleMapper;

    private final RoleMemberShipRepository roleMemberShipRepo;

    private final ClubRepository clubRepository;
    private final SystemRoleRepository systemRoleRepository;
    private final UserService userService;


    @Override
    public List<ClubRoleResponse> getClubRolesByClubId(Long clubId) {
        List<ClubRole> clubRoles = clubRoleRepository.findByClubId(clubId);
        return clubRoleMapper.toDtos(clubRoles);
    }

    @Override
    public boolean isClubLeaderOrVice(Long userId, Long clubId) {
        return roleMemberShipRepo.existsClubAdmin(userId, clubId);
    }

    @Override
    public boolean isTeamLeader(Long userId, Long teamId) {
        return roleMemberShipRepo.existsTeamLeader(userId, teamId, "_HEAD");
    }

    @Override
    @Transactional
    public ClubRoleResponse createClubRole(Long clubId,
                                           CreateClubRoleRequest request) throws AppException {
        // 1. Lấy user hiện tại
        Long currentUserId = userService.getCurrentUserId();

        // 2. Chỉ Chủ nhiệm / Phó chủ nhiệm mới được tạo (check bằng repository existsClubAdmin)
        if (!isClubLeaderOrVice(currentUserId, clubId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }

        // 3. Dùng ClubRoleRepository để CHECK TRÙNG
        // 3.1. Trùng roleCode trong cùng club?
        if (clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCase(clubId, request.getRoleCode())) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        // 3.2. Trùng roleName trong cùng club?
        if (clubRoleRepository.existsByClubIdAndRoleNameIgnoreCase(clubId, request.getRoleName())) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        // 4. Check roleLevel (không cho <= 2 để tránh trùng cấp admin)
        if (request.getRoleLevel() == null || request.getRoleLevel() <= 1) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        // 5. Lấy club bằng repository
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));

        // 6. Lấy SystemRole bằng repository (nếu có id)
        SystemRole systemRole = null;
        if (request.getSystemRoleId() != null) {
            systemRole = systemRoleRepository.findById(request.getSystemRoleId())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
        }

        // 7. Build entity mới
        ClubRole newRole = ClubRole.builder()
                .roleName(request.getRoleName().trim())
                .roleCode(request.getRoleCode().trim())
                .description(request.getDescription())
                .roleLevel(request.getRoleLevel())
                .club(club)
                .systemRole(systemRole)
                .build();

        // 8. Lưu DB
        ClubRole saved = clubRoleRepository.save(newRole);

        // 9. Map sang DTO bằng ClubRoleMapper bạn đã có
        return clubRoleMapper.toDto(saved);
    }

    @Override
    @Transactional
    public ClubRoleResponse updateClubRole(Long clubId,
                                           Long roleId,
                                           UpdateClubRoleRequest request) throws AppException {

        // 1. Lấy user hiện tại
        Long currentUserId = userService.getCurrentUserId();

        // 2. Chỉ Chủ nhiệm / Phó chủ nhiệm mới được sửa
        if (!isClubLeaderOrVice(currentUserId, clubId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }

        // 3. Lấy role cần sửa
        ClubRole role = clubRoleRepository.findById(roleId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));

        // 3.1. Đảm bảo role này thuộc đúng club
        if (role.getClub() == null || !role.getClub().getId().equals(clubId)) {
            // không cho sửa role của club khác
            throw new AppException(ErrorCode.FORBIDDEN);
        }

        // 4. Check trùng roleCode / roleName trong cùng club, exclude role hiện tại
        if (clubRoleRepository.existsByClubIdAndRoleCodeIgnoreCaseAndIdNot(
                clubId, request.getRoleCode(), roleId)) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        if (clubRoleRepository.existsByClubIdAndRoleNameIgnoreCaseAndIdNot(
                clubId, request.getRoleName(), roleId)) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        // 5. Check roleLevel (không cho chỉnh xuống <= 2)
        if (request.getRoleLevel() == null || request.getRoleLevel() <= 1) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        // 6. Cập nhật dữ liệu
        role.setRoleName(request.getRoleName().trim());
        role.setRoleCode(request.getRoleCode().trim());
        role.setDescription(request.getDescription());
        role.setRoleLevel(request.getRoleLevel());

        // 7. Cập nhật SystemRole nếu có
        if (request.getSystemRoleId() != null) {
            SystemRole systemRole = systemRoleRepository.findById(request.getSystemRoleId())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
            role.setSystemRole(systemRole);
        } else {
            role.setSystemRole(null);
        }

        // 8. Lưu lại
        ClubRole saved = clubRoleRepository.save(role);

        // 9. Map sang DTO trả về
        return clubRoleMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void deleteClubRole(Long clubId, Long roleId) throws AppException {
        // 1. Lấy user hiện tại
        Long currentUserId = userService.getCurrentUserId();

        // 2. Chỉ Chủ nhiệm / Phó chủ nhiệm mới được xoá
        if (!isClubLeaderOrVice(currentUserId, clubId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }

        // 3. Lấy role cần xoá
        ClubRole role = clubRoleRepository.findById(roleId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));

        // 3.1. Đảm bảo role thuộc đúng club
        if (role.getClub() == null || !role.getClub().getId().equals(clubId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }

        // 4. Không cho xoá các role "admin" level <= 2 (phòng xoá nhầm Chủ nhiệm/Phó)
        if (role.getRoleLevel() != null && role.getRoleLevel() <= 1) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        // 5. Xoá – do ClubRole có cascade ALL tới RoleMemberShip,
        //    các role_memberships liên quan sẽ bị xoá theo
        clubRoleRepository.delete(role);
    }


}
