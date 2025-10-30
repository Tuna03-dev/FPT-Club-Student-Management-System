package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.ResourceNotFoundException;
import com.sep490.backendclubmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

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

        return clubMembershipRepository
                .findClubsByUserIdAndSemesterId(currentUser.getId(), currentSemester.getId());
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
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new ResourceNotFoundException("No active semester."));

        boolean isMember = clubMembershipRepository
                .findClubsByUserIdAndSemesterId(currentUser.getId(), currentSemester.getId())
                .stream()
                .anyMatch(c -> c.getClubId().equals(clubId));

        if (!isMember) {
            throw new ResourceNotFoundException("User is not a member of this club in the current semester.");
        }
    }
}
