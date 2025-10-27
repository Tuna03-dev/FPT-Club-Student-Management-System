package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.MyTeamDetailDTO;
import com.sep490.backendclubmanagement.dto.response.TeamMemberDTO;
import com.sep490.backendclubmanagement.dto.response.VisibleTeamDTO;
import com.sep490.backendclubmanagement.entity.Semester;
import com.sep490.backendclubmanagement.entity.Team;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.exception.ResourceNotFoundException;
import com.sep490.backendclubmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClubTeamVisibilityService {

    private final RoleMemberShipRepository roleMembershipRepository;
    private final TeamRepository teamRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;

    public List<VisibleTeamDTO> getVisibleTeams(Long clubId, Long semesterIdNullable) {
        User currentUser = getCurrentUser();
        Long semesterId = resolveSemesterId(semesterIdNullable);

        boolean isAdmin = roleMembershipRepository.isClubAdmin(currentUser.getId(), clubId, semesterId);

        // Admin: thấy tất cả team trong CLB
        List<Team> teams = isAdmin
                ? teamRepository.findAllByClubId(clubId)
                : Collections.emptyList();

        // Member thường: chỉ thấy team mình tham gia
        List<Object[]> myTeamRows = isAdmin
                ? Collections.emptyList()
                : roleMembershipRepository.findMyTeamsInClub(currentUser.getId(), clubId, semesterId);

        // Map teamId -> memberCount
        Map<Long, Long> memberCountMap = roleMembershipRepository.countMembersByTeam(clubId, semesterId)
                .stream()
                .collect(Collectors.toMap(
                        r -> ((Number) r[0]).longValue(),
                        r -> ((Number) r[1]).longValue()
                ));

        // Map teamId -> myRoles
        Map<Long, List<String>> myRolesMap = roleMembershipRepository.findMyRolesPerTeam(currentUser.getId(), clubId, semesterId)
                .stream()
                .collect(Collectors.groupingBy(
                        r -> (Long) r[0],
                        Collectors.mapping(r -> (String) r[1], Collectors.toList())
                ));

        List<VisibleTeamDTO> result = new ArrayList<>();

        if (isAdmin) {
            for (Team t : teams) {
                result.add(new VisibleTeamDTO(
                        t.getId(),
                        t.getTeamName(),
                        t.getDescription(),
                        memberCountMap.getOrDefault(t.getId(), 0L),
                        myRolesMap.getOrDefault(t.getId(), List.of()) // admin có thể rỗng nếu không thuộc team
                ));
            }
        } else {
            for (Object[] r : myTeamRows) {
                Long teamId = ((Number) r[0]).longValue();
                String name = (String) r[1];
                String desc = (String) r[2];
                result.add(new VisibleTeamDTO(
                        teamId,
                        name,
                        desc,
                        memberCountMap.getOrDefault(teamId, 0L),
                        myRolesMap.getOrDefault(teamId, List.of())
                ));
            }
        }

        return result;
    }

    public MyTeamDetailDTO getTeamDetail(Long clubId, Long teamId, Long semesterIdNullable) {
        User currentUser = getCurrentUser();
        Long semesterId = resolveSemesterId(semesterIdNullable);

        boolean isAdmin  = roleMembershipRepository.isClubAdmin(currentUser.getId(), clubId, semesterId);
        boolean isMember = roleMembershipRepository.isMyTeam(currentUser.getId(), clubId, teamId, semesterId);

        if (!isAdmin && !isMember) {
            throw new ResourceNotFoundException("User cannot access this team.");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id " + teamId));

        Long memberCount = roleMembershipRepository.countDistinctMembers(teamId, semesterId);
        List<String> myRoles = roleMembershipRepository.findMyRoles(currentUser.getId(), teamId, semesterId);

        // ✅ CN/PCN xem được toàn bộ thành viên dù không thuộc team
        List<TeamMemberDTO> members = roleMembershipRepository
                .findMembersByTeamIdAndSemesterId(teamId, semesterId);

        // (tuỳ chọn) nếu muốn hiển thị rõ hơn vai trò admin trong UI:
        if (isAdmin && myRoles.isEmpty()) {
            myRoles = List.of("Quyền quản trị cấp CLB");
        }

        return new MyTeamDetailDTO(
                team.getId(),
                team.getTeamName(),
                team.getDescription(),
                /* isMember */ isMember,
                myRoles,
                memberCount,
                members
        );
    }

    // ---------- helpers ----------

    private Long resolveSemesterId(Long semesterIdNullable) {
        if (semesterIdNullable != null) return semesterIdNullable;
        Semester current = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new ResourceNotFoundException("Current semester not found."));
        return current.getId();
    }

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
}
