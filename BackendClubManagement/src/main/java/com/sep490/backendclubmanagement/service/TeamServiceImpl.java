package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateTeamRequest;
import com.sep490.backendclubmanagement.dto.response.AvailableMemberDTO;
import com.sep490.backendclubmanagement.dto.response.TeamResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AccessDeniedException;
import com.sep490.backendclubmanagement.exception.DuplicateResourceException;
import com.sep490.backendclubmanagement.exception.ResourceNotFoundException;
import com.sep490.backendclubmanagement.mapper.TeamMapper;
import com.sep490.backendclubmanagement.repository.*;
import com.sep490.backendclubmanagement.security.RoleGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final TeamMapper teamMapper;
    private final ClubRepository clubRepository;
    private final SemesterRepository semesterRepository;
    private final ClubRoleRepository clubRoleRepository;
    private final ClubMemberShipRepository clubMembershipRepository;
    private final RoleMemberShipRepository roleMembershipRepository;
    private final RoleGuard guard;
    private final UserRepository userRepository;

    // === ROLE CODE CHUẨN ===
    private static final String ROLE_CODE_TEAM_HEAD = "CLUB_TEAM_HEAD";
    private static final String ROLE_CODE_TEAM_DEPUTY = "CLUB_TEAM_DEPUTY";
    private static final String ROLE_CODE_TEAM_MEMBER = "CLUB_MEMBER";

    @Override
    public List<TeamResponse> getTeamsByClubId(Long clubId) {
        return teamRepository.findByClubId(clubId).stream()
                .map(teamMapper::toDto)
                .toList();
    }

    @Override
    @Transactional
    public TeamResponse createTeam(CreateTeamRequest request) {

        validateDistinctLeaderAndVice(request);

        // Chuẩn hóa tên ban
        final String normalizedTeamName = request.getTeamName()
                .trim()
                .replaceAll("\\s+", " ");

        // Lấy học kỳ hiện tại
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy học kỳ hiện tại."));

        // Lấy CLB
        Club club = clubRepository.findById(request.getClubId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy CLB với ID: " + request.getClubId()));

        // Check quyền
        Long currentUserId = guard.getCurrentUserId();
        boolean canCreate = guard.isClubPresident(currentUserId, club.getId())
                || guard.isClubVice(currentUserId, club.getId());

        if (!canCreate) {
            throw new AccessDeniedException("Chỉ Chủ nhiệm hoặc Phó chủ nhiệm CLB mới được phép tạo phòng ban.");
        }

        // Check trùng tên ban (ignore-case)
        if (teamRepository.existsByClubIdAndTeamNameIgnoreCase(club.getId(), normalizedTeamName)) {
            throw new DuplicateResourceException("Tên ban '" + normalizedTeamName + "' đã tồn tại trong CLB này.");
        }

        // Gom user
        List<Long> userIdsToAssign = new ArrayList<>();
        if (request.getLeaderUserId() != null) userIdsToAssign.add(request.getLeaderUserId());
        if (request.getViceLeaderUserId() != null) userIdsToAssign.add(request.getViceLeaderUserId());
        if (request.getMemberUserIds() != null) userIdsToAssign.addAll(request.getMemberUserIds());

        List<Long> distinctUserIds = userIdsToAssign.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        // Load membership
        final Map<Long, ClubMemberShip> membershipMap = distinctUserIds.isEmpty()
                ? Collections.emptyMap()
                : clubMembershipRepository.findByUserIdInAndClubId(distinctUserIds, club.getId())
                .stream()
                .collect(Collectors.toMap(cm -> cm.getUser().getId(), cm -> cm));

        // Check user hợp lệ
        if (!distinctUserIds.isEmpty()) {

            List<Long> notInClub = distinctUserIds.stream()
                    .filter(uid -> !membershipMap.containsKey(uid))
                    .toList();

            if (!notInClub.isEmpty()) {
                throw new ResourceNotFoundException("Các User ID không thuộc CLB: " + notInClub);
            }

            List<Long> alreadyInTeam = roleMembershipRepository
                    .findExistingTeamMembersInSemester(club.getId(), currentSemester.getId(), distinctUserIds);

            if (!alreadyInTeam.isEmpty()) {
                throw new DuplicateResourceException("Các User ID đã thuộc một ban khác trong kỳ hiện tại: " + alreadyInTeam);
            }
        }

        // Tạo team
        Team newTeam = new Team();
        newTeam.setTeamName(normalizedTeamName);
        newTeam.setDescription(request.getDescription());
        newTeam.setLinkGroupChat(request.getLinkGroupChat());
        newTeam.setClub(club);

        Team savedTeam = teamRepository.save(newTeam);

        // Gán role theo ROLE CODE
        if (!distinctUserIds.isEmpty()) {

            ClubRole leaderRole = getRole(club.getId(), ROLE_CODE_TEAM_HEAD);
            ClubRole viceLeaderRole = getRole(club.getId(), ROLE_CODE_TEAM_DEPUTY);
            ClubRole memberRole = getRole(club.getId(), ROLE_CODE_TEAM_MEMBER);

            // Leader
            if (request.getLeaderUserId() != null) {
                assignRoleToTeam(
                        membershipMap.get(request.getLeaderUserId()),
                        request.getLeaderUserId(),
                        leaderRole,
                        savedTeam,
                        currentSemester
                );
            }

            // Vice Leader
            if (request.getViceLeaderUserId() != null) {
                assignRoleToTeam(
                        membershipMap.get(request.getViceLeaderUserId()),
                        request.getViceLeaderUserId(),
                        viceLeaderRole,
                        savedTeam,
                        currentSemester
                );
            }

            // Thành viên
            if (request.getMemberUserIds() != null) {
                for (Long memberId : request.getMemberUserIds()) {
                    if (memberId == null) continue;
                    if (!Objects.equals(memberId, request.getLeaderUserId())
                            && !Objects.equals(memberId, request.getViceLeaderUserId())) {

                        assignRoleToTeam(
                                membershipMap.get(memberId),
                                memberId,
                                memberRole,
                                savedTeam,
                                currentSemester
                        );
                    }
                }
            }
        }

        return teamMapper.toDto(savedTeam);
    }

    private ClubRole getRole(Long clubId, String roleCode) {
        return clubRoleRepository.findByClubIdAndRoleCode(clubId, roleCode)
                .or(() -> clubRoleRepository.findByRoleCodeAndClubIsNull(roleCode))
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy role_code = " + roleCode + " cho CLB: " + clubId));
    }

    private void validateDistinctLeaderAndVice(CreateTeamRequest request) {
        if (request.getLeaderUserId() != null
                && request.getViceLeaderUserId() != null
                && request.getLeaderUserId().equals(request.getViceLeaderUserId())) {
            throw new DuplicateResourceException("Leader và Vice không thể là cùng một người.");
        }
    }

    private void assignRoleToTeam(
            ClubMemberShip membership,
            Long userId,
            ClubRole role,
            Team team,
            Semester semester
    ) {
        if (membership == null) {
            throw new ResourceNotFoundException("User ID " + userId + " không phải là thành viên của CLB.");
        }

        RoleMemberShip newRoleAssignment = new RoleMemberShip();
        newRoleAssignment.setClubMemberShip(membership);
        newRoleAssignment.setClubRole(role);
        newRoleAssignment.setTeam(team);
        newRoleAssignment.setSemester(semester);
        newRoleAssignment.setIsActive(true);

        roleMembershipRepository.save(newRoleAssignment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvailableMemberDTO> getAvailableMembers(Long clubId) {

        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy học kỳ hiện tại."));

        List<Long> ids = roleMembershipRepository.findAvailableMemberUserIds(clubId, currentSemester.getId());
        if (ids.isEmpty()) return List.of();

        return userRepository.findByIdIn(ids).stream()
                .map(u -> AvailableMemberDTO.builder()
                        .userId(u.getId())
                        .fullName(u.getFullName())
                        .avatarUrl(u.getAvatarUrl())
                        .email(u.getEmail())
                        .build())
                .toList();
    }
}
