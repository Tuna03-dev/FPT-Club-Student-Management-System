package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.ResourceNotFoundException;
import com.sep490.backendclubmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClubManagementService {

    private final ClubMemberShipRepository clubMembershipRepository;
    private final SemesterRepository semesterRepository;
    private final TeamRepository teamRepository;
    private final RoleMemberShipRepository roleMembershipRepository;
    private final PostRepository postRepository;
    private final NewsRepository newsRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository; // ✅ thêm repo để load entity User

    public List<MyClubDTO> getMyClubs() {
        User currentUser = getCurrentUser();
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new ResourceNotFoundException("Current semester not found."));

        // ✅ Đồng bộ với getUserClubRoles(): lấy tất cả active memberships, không yêu cầu role trong semester
        List<MyClubDTO> clubs = clubMembershipRepository
                .findActiveClubsByUserId(currentUser.getId());
        
        // Enrich với club roles cho mỗi club
        for (MyClubDTO club : clubs) {
            List<String> roles = roleMembershipRepository.findClubRolesByUserAndClub(
                currentUser.getId(), club.getClubId(), currentSemester.getId()
            );
            // Nếu không có role trong semester hiện tại, thêm role mặc định "thành viên"
            if (roles.isEmpty()) {
                roles = List.of("thành viên");
            }
            club.setClubRoles(roles);
        }
        
        return clubs;
    }

    public ClubDetailDTO getClubManagementDetail(Long clubId) {
        // Kiểm tra quyền: người dùng phải là thành viên của CLB này trong kỳ hiện tại
        validateUserMembership(clubId);

        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ResourceNotFoundException("Club not found with id " + clubId));

        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new ResourceNotFoundException("Current semester not found."));

        List<Team> teams = teamRepository.findAllByClubId(clubId);
        List<TeamDetailDTO> teamDetailDTOs = new ArrayList<>();

        for (Team team : teams) {
            TeamDetailDTO teamDto = new TeamDetailDTO();
            teamDto.setTeamId(team.getId());
            teamDto.setTeamName(team.getTeamName());
            teamDto.setDescription(team.getDescription());

            List<TeamMemberDTO> members =
                    roleMembershipRepository.findMembersByTeamIdAndSemesterId(team.getId(), currentSemester.getId());

            teamDto.setMembers(members);
            teamDto.setMemberCount(members.size());

            List<Long> memberUserIds = members.stream()
                    .map(TeamMemberDTO::getUserId)
                    .collect(Collectors.toList());

            if (!memberUserIds.isEmpty()) {
                List<ActivityDTO> activities = new ArrayList<>();
                activities.addAll(postRepository.findActivitiesByAuthorIds(memberUserIds));
                activities.addAll(newsRepository.findActivitiesByAuthorIds(memberUserIds));
                activities.sort((a1, a2) -> a2.getCreatedAt().compareTo(a1.getCreatedAt()));
                teamDto.setActivities(activities);
            } else {
                teamDto.setActivities(Collections.emptyList());
            }

            teamDetailDTOs.add(teamDto);
        }

        return ClubDetailDTO.builder()
                .clubId(club.getId())
                .clubName(club.getClubName())
                .teams(teamDetailDTOs)
                .build();
    }

    // ✅ Không cast trực tiếp principal sang entity User nữa
    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("Unauthenticated.");
        }

        Object principal = auth.getPrincipal();
        String email;

        if (principal instanceof UserDetails ud) {
            email = ud.getUsername(); // username = email
        } else if (principal instanceof String s) {
            if ("anonymousUser".equalsIgnoreCase(s)) {
                throw new IllegalStateException("Anonymous user.");
            }
            email = s;
        } else {
            throw new IllegalStateException("Unsupported principal type: " + principal.getClass());
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User not found in database with email: " + email));
    }

    private void validateUserMembership(Long clubId) {
        User currentUser = getCurrentUser();

        // ✅ Đồng bộ với getUserClubRoles(): chỉ cần check active membership, không yêu cầu role trong semester
        boolean isMember = clubMembershipRepository
                .findActiveClubsByUserId(currentUser.getId())
                .stream()
                .anyMatch(c -> c.getClubId().equals(clubId));

        if (!isMember) {
            throw new ResourceNotFoundException("User is not an active member of this club.");
        }
    }

    /**
     * Lấy danh sách club roles của user trong semester hiện tại
     * Dùng cho authentication response
     */
    @Transactional(readOnly = true)
    public List<ClubRoleInfo> getUserClubRoles(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + userId));

        if (!user.getIsActive()) {
            throw new ResourceNotFoundException("User is not active.");
        }

        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new ResourceNotFoundException("Current semester not found."));

        // ✅ Lấy luôn ClubMemberShip entity (đã filter ACTIVE), loại bỏ N+1 query
        List<ClubMemberShip> memberships = clubMembershipRepository
                .findActiveClubMembershipsByUserId(userId);

        List<ClubRoleInfo> clubRoleInfos = new ArrayList<>();

        for (ClubMemberShip membership : memberships) {
            // ✅ Đã có entity, không cần query lại
            Long clubId = membership.getClub().getId();
            String clubName = membership.getClub().getClubName();

            // Lấy danh sách role memberships của user trong club này
            // Sử dụng query với fetch join để load team và clubRole cùng lúc, tránh lazy loading issues
            List<RoleMemberShip> roleMemberships = roleMembershipRepository
                    .findByClubMemberShipIdAndSemesterIdAndIsActiveWithFetch(
                            membership.getId(),
                            currentSemester.getId(),
                            true
                    );

            // Nếu không có role membership, thêm role mặc định "thành viên"
            if (roleMemberships.isEmpty()) {
                clubRoleInfos.add(ClubRoleInfo.builder()
                        .clubId(clubId)
                        .clubName(clubName)
                        .clubRole("thành viên")
                        .systemRole("MEMBER")
                        .build());
            } else {
                // Lấy tất cả roles của user trong club này
                for (RoleMemberShip rm : roleMemberships) {
                    // Với fetch join, team, clubRole và systemRole đã được load
                    String clubRoleName = rm.getClubRole() != null ? rm.getClubRole().getRoleName() : null;
                    // Lấy roleName từ SystemRole thay vì roleCode từ ClubRole
                    String systemRoleName = rm.getClubRole() != null && rm.getClubRole().getSystemRole() != null 
                            ? rm.getClubRole().getSystemRole().getRoleName() : null;
                    
                    // Nếu có clubRole thì thêm vào kết quả (bất kể có team hay không)
                    if (rm.getClubRole() != null) {
                        clubRoleInfos.add(ClubRoleInfo.builder()
                                .clubId(clubId)
                                .clubName(clubName)
                                .clubRole(clubRoleName)
                                .systemRole(systemRoleName)
                                .build());
                    }
                }
            }
        }

        return clubRoleInfos;
    }
}
