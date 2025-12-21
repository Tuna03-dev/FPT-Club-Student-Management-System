package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateTeamRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateTeamRequest;
import com.sep490.backendclubmanagement.dto.response.AvailableMemberDTO;
import com.sep490.backendclubmanagement.dto.response.TeamResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.*;
import com.sep490.backendclubmanagement.mapper.TeamMapper;
import com.sep490.backendclubmanagement.repository.*;
import com.sep490.backendclubmanagement.security.RoleGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    private final NotificationService notificationService;
    private final WebSocketService webSocketService;

    // === ROLE CODE CHUẨN ===
    private static final String ROLE_CODE_TEAM_HEAD = "CLUB_TEAM_HEAD";
    private static final String ROLE_CODE_TEAM_DEPUTY = "CLUB_TEAM_DEPUTY";
    private static final String ROLE_CODE_TEAM_MEMBER = "MEMBER";

    @Override
    public List<TeamResponse> getTeamsByClubId(Long clubId) {
        return teamRepository.findVisibleTeams(clubId).stream()
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

        // Validate tên ban có nghĩa
        validateMeaningfulTeamName(normalizedTeamName);

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
             throw new AppException(ErrorCode.TEAM_NAME_EXISTED,"Tên ban '" + normalizedTeamName + "' đã tồn tại trong CLB này.");
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

            roleMembershipRepository.deactivateActiveRolesForUsers(
                    distinctUserIds,
                    club.getId(),
                    currentSemester.getId()
            );
        }

        // Tạo team
        Team newTeam = new Team();
        newTeam.setTeamName(normalizedTeamName);
        newTeam.setDescription(request.getDescription());
        newTeam.setLinkGroupChat(request.getLinkGroupChat());
        newTeam.setClub(club);

        Team savedTeam = teamRepository.save(newTeam);

        // REALTIME: broadcast cho toàn CLB biết có team mới
        webSocketService.broadcastToClub(
                club.getId(),
                "TEAM",
                "CREATED",
                Map.of(
                        "teamId", savedTeam.getId(),
                        "clubId", club.getId(),
                        "teamName", savedTeam.getTeamName()
                )
        );

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
                        currentSemester,
                        currentUserId
                );
            }

            // Vice Leader
            if (request.getViceLeaderUserId() != null) {
                assignRoleToTeam(
                        membershipMap.get(request.getViceLeaderUserId()),
                        request.getViceLeaderUserId(),
                        viceLeaderRole,
                        savedTeam,
                        currentSemester,
                        currentUserId
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
                                currentSemester,
                                currentUserId
                        );
                    }
                }
            }
        }

        return teamMapper.toDto(savedTeam);
    }

    // 🔥 UPDATE TEAM
    @Override
    @Transactional
    public TeamResponse updateTeam(Long teamId, UpdateTeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban với ID: " + teamId));

        Club club = team.getClub();
        if (club == null) {
            throw new IllegalStateException("Phòng ban không gắn với CLB nào.");
        }

        Long currentUserId = guard.getCurrentUserId();
        boolean canManage = guard.isClubPresident(currentUserId, club.getId())
                || guard.isClubVice(currentUserId, club.getId());
        if (!canManage) {
            throw new AccessDeniedException("Chỉ Chủ nhiệm hoặc Phó chủ nhiệm CLB mới được phép sửa phòng ban.");
        }

        String oldName = team.getTeamName();
        boolean nameChanged = false;

        // Tên mới
        if (request.getTeamName() != null && !request.getTeamName().isBlank()) {
            String normalizedName = request.getTeamName().trim().replaceAll("\\s+", " ");
            validateMeaningfulTeamName(normalizedName);

            // nếu khác tên cũ (ignore-case) thì mới check trùng & set
            if (!normalizedName.equalsIgnoreCase(oldName)) {
                if (teamRepository.existsByClubIdAndTeamNameIgnoreCaseAndIdNot(
                        club.getId(), normalizedName, teamId)) {
                     throw new AppException(ErrorCode.TEAM_NAME_EXISTED,
                             "Tên ban '" + normalizedName + "' đã tồn tại trong CLB này.");
                }
                team.setTeamName(normalizedName);
                nameChanged = true;
            }
        }

        // Mô tả
        if (request.getDescription() != null) {
            String desc = request.getDescription().trim();
            team.setDescription(desc.isEmpty() ? null : desc);
        }

        // Link nhóm chat
        if (request.getLinkGroupChat() != null) {
            String link = request.getLinkGroupChat().trim();
            team.setLinkGroupChat(link.isEmpty() ? null : link);
        }

        Team saved = teamRepository.save(team);

        // Lấy toàn bộ member trong ban
        List<RoleMemberShip> activeRoles = roleMembershipRepository.findByTeamIdAndIsActiveTrue(teamId);
        Set<Long> memberIds = activeRoles.stream()
                .map(rm -> rm.getClubMemberShip().getUser().getId())
                .collect(Collectors.toSet());

        // Realtime: broadcast cho cả CLB
        webSocketService.broadcastToClub(
                club.getId(),
                "TEAM",
                "UPDATED",
                Map.of(
                        "teamId", saved.getId(),
                        "clubId", club.getId(),
                        "teamName", saved.getTeamName()
                )
        );

        // Notification cho tất cả thành viên trong ban
        if (!memberIds.isEmpty()) {
            String title;
            String message;

            if (nameChanged) {
                title = "Ban của bạn đã được đổi tên";
                message = String.format(
                        "Chủ nhiệm CLB đã đổi tên ban từ \"%s\" thành \"%s\" trong CLB %s.",
                        oldName,
                        saved.getTeamName(),
                        club.getClubName()
                );
            } else {
                title = "Thông tin ban đã được cập nhật";
                message = String.format(
                        "Chủ nhiệm CLB đã cập nhật thông tin Ban %s trong CLB %s.",
                        saved.getTeamName(),
                        club.getClubName()
                );
            }

            String actionUrl = "/myclub/" + club.getId() + "/teams/" + saved.getId();

            try {
                notificationService.sendToUsers(
                        new ArrayList<>(memberIds),
                        currentUserId,
                        title,
                        message,
                        NotificationType.TEAM_ASSIGNMENT,
                        NotificationPriority.NORMAL,
                        actionUrl,
                        club.getId(),
                        null,
                        saved.getId(),
                        null
                );
            } catch (Exception e) {
                // không muốn vỡ cả API nếu 1 vài noti fail
            }
        }

        return teamMapper.toDto(saved);
    }

    // 🔥 DELETE TEAM
    @Override
    @Transactional
    public void deleteTeam(Long teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy phòng ban với ID: " + teamId));

        Club club = team.getClub();
        if (club == null) {
            throw new IllegalStateException("Phòng ban không gắn với CLB nào.");
        }

        Long currentUserId = guard.getCurrentUserId();
        boolean canManage = guard.isClubPresident(currentUserId, club.getId())
                || guard.isClubVice(currentUserId, club.getId());
        if (!canManage) {
            throw new AccessDeniedException(
                    "Chỉ Chủ nhiệm hoặc Phó chủ nhiệm CLB mới được phép xoá phòng ban.");
        }

        // 🔥 NEW: chỉ cho xoá nếu team chưa từng có role_membership nào
        boolean hasAnyRoleHistory = roleMembershipRepository.existsByTeamId(teamId);
        if (hasAnyRoleHistory) {
            // dùng AppException để GlobalExceptionHandler trả ra ApiResponse đẹp
            throw new AppException(
                    ErrorCode.TEAM_HAS_HISTORY,
                    "Không thể xoá phòng ban '" + team.getTeamName()
                            + "' vì đã từng có thành viên thuộc phòng ban này.");
        }

        // Nếu không có lịch sử gì ⇒ xoá hẳn luôn
        teamRepository.delete(team);

        // (tuỳ bạn: có thể broadcast realtime nhẹ nếu vẫn muốn cập nhật UI cho president)
        webSocketService.broadcastToClub(
                club.getId(),
                "TEAM",
                "DELETED",
                Map.of(
                        "teamId", teamId,
                        "clubId", club.getId(),
                        "teamName", team.getTeamName()
                )
        );
    }



    // ========== HELPER ==========

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

    // Validate tên ban có “nghĩa” (lọc bớt tên rác)
    private void validateMeaningfulTeamName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Tên ban không được để trống.");
        }

        String n = name.trim().replaceAll("\\s+", " ");

        // Độ dài
        if (n.length() < 3) {
            throw new IllegalArgumentException("Tên ban phải có ít nhất 3 ký tự.");
        }

        // Phải chứa chữ cái
        if (!n.codePoints().anyMatch(Character::isLetter)) {
            throw new IllegalArgumentException("Tên ban phải chứa ít nhất một chữ cái.");
        }

        // ❌ Không cho phép số
        if (n.matches(".*\\d.*")) {
            throw new IllegalArgumentException("Tên ban không được chứa số.");
        }

        // Không tên toàn số
        if (n.codePoints().allMatch(Character::isDigit)) {
            throw new IllegalArgumentException("Tên ban không được chỉ gồm chữ số.");
        }

        // Không toàn ký tự lặp
        String compact = n.replaceAll("\\s+", "");
        if (compact.length() >= 3 && compact.chars().distinct().count() == 1) {
            throw new IllegalArgumentException("Tên ban không hợp lệ. Vui lòng nhập tên có nghĩa hơn.");
        }

        // Hạn chế ký tự đặc biệt
        long specialCount = n.codePoints()
                .filter(cp -> !Character.isLetterOrDigit(cp) && !Character.isWhitespace(cp))
                .count();
        if (specialCount > 3) {
            throw new IllegalArgumentException("Tên ban có quá nhiều ký tự đặc biệt. Vui lòng đặt tên dễ đọc hơn.");
        }
    }

    private void assignRoleToTeam(
            ClubMemberShip membership,
            Long userId,
            ClubRole role,
            Team team,
            Semester semester,
            Long actorId
    ) {
        if (membership == null) {
            throw new ResourceNotFoundException(
                    "User ID " + userId + " không phải là thành viên của CLB."
            );
        }

        // 1️⃣ Lấy TẤT CẢ role của user trong kỳ
        List<RoleMemberShip> rolesInSemester =
                roleMembershipRepository.findByClubMemberShipIdAndSemesterId(
                        membership.getId(),
                        semester.getId()
                );

        RoleMemberShip targetRole = null;

        for (RoleMemberShip rm : rolesInSemester) {
            // ❌ mỗi người chỉ được thuộc 1 team
            rm.setTeam(null);

            // 🔍 tìm role cần assign
            if (rm.getClubRole().getId().equals(role.getId())) {
                targetRole = rm;
            }
        }

        // 2️⃣ Nếu đã có role này → update
        if (targetRole != null) {
            targetRole.setTeam(team);
            targetRole.setIsActive(true);
            roleMembershipRepository.save(targetRole);
        }
        // 3️⃣ Nếu CHƯA có role này → tạo mới
        else {
            RoleMemberShip rm = new RoleMemberShip();
            rm.setClubMemberShip(membership);
            rm.setClubRole(role);
            rm.setSemester(semester);
            rm.setTeam(team);
            rm.setIsActive(true);
            roleMembershipRepository.save(rm);
        }

        // 4️⃣ Realtime
        webSocketService.broadcastToUser(
                userId,
                "TEAM",
                "ASSIGNED",
                Map.of(
                        "teamId", team.getId(),
                        "clubId", team.getClub().getId(),
                        "roleCode", role.getRoleCode()
                )
        );

        // 5️⃣ Notification
        sendTeamWelcomeNotification(
                userId,
                actorId,
                membership.getClub(),
                team,
                role
        );
    }


    private void sendTeamWelcomeNotification(
            Long recipientId,
            Long actorId,
            Club club,
            Team team,
            ClubRole role
    ) {
        String roleLabel;
        switch (role.getRoleCode()) {
            case ROLE_CODE_TEAM_HEAD -> roleLabel = "Trưởng ban";
            case ROLE_CODE_TEAM_DEPUTY -> roleLabel = "Phó ban";
            default -> roleLabel = "Thành viên";
        }

        String title = "Chào mừng bạn đến với " + team.getTeamName();
        String message = String.format(
                "Chào mừng bạn trở thành %s của Ban %s thuộc CLB %s. "
                        + "Hãy vào hệ thống để xem thông tin chi tiết và tham gia hoạt động nhé!",
                roleLabel,
                team.getTeamName(),
                club.getClubName()
        );

        String actionUrl = "/myclub/" + club.getId() + "/teams/" + team.getId();

        try {
            notificationService.sendToUser(
                    recipientId,
                    actorId,
                    title,
                    message,
                    NotificationType.TEAM_ASSIGNMENT,
                    NotificationPriority.NORMAL,
                    actionUrl,
                    club.getId(),
                    null,
                    team.getId(),
                    null,
                    null
            );
        } catch (AppException e) {
            // ignore
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvailableMemberDTO> getAvailableMembers(Long clubId) {

        List<Long> ids = clubMembershipRepository.findAvailableMemberUserIds(clubId);

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
