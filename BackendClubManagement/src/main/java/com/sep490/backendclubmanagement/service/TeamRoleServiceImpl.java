package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.MyTeamRoleResponse;
import com.sep490.backendclubmanagement.dto.response.TeamMemberDTO;
import com.sep490.backendclubmanagement.entity.Semester;
import com.sep490.backendclubmanagement.entity.Team;
import com.sep490.backendclubmanagement.repository.RoleMemberShipRepository;
import com.sep490.backendclubmanagement.repository.SemesterRepository;
import com.sep490.backendclubmanagement.repository.TeamRepository;
import com.sep490.backendclubmanagement.security.RoleGuard;
import com.sep490.backendclubmanagement.service.TeamRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class TeamRoleServiceImpl implements TeamRoleService {

    private final TeamRepository teamRepo;
    private final RoleMemberShipRepository rmRepo;
    private final SemesterRepository semesterRepo;
    private final RoleGuard guard;

    @Override
    @Transactional(readOnly = true)
    public MyTeamRoleResponse getMyRole(Long me, Long clubId, Long teamId) {
        // 1) Team phải thuộc CLB
        Team team = teamRepo.findByIdAndClubId(teamId, clubId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy ban trong CLB."));

        // 2) Học kỳ hiện tại (nếu có)
        Long semesterId = semesterRepo.findCurrentSemester().map(Semester::getId).orElse(null);

        // 3) Vai trò của chính mình trong team
        List<String> myRoles = rmRepo.findMyRoles(me, teamId, semesterId);
        boolean isMember = !myRoles.isEmpty() || guard.isStaff(me);

        // 4) Danh sách thành viên + count
        List<TeamMemberDTO> membersDto = rmRepo.findMembersByTeamIdAndSemesterId(teamId, semesterId);

        // 5) Build output (format đúng JSON FE đang xài)
        return MyTeamRoleResponse.builder()
                .teamId(team.getId())
                .teamName(team.getTeamName())
                .description(team.getDescription())
                .member(isMember)
                .myRoles(myRoles.isEmpty() && guard.isStaff(me) ? List.of("STAFF") : myRoles)
                .memberCount(membersDto.size())
                .members(membersDto.stream().map(m ->
                        MyTeamRoleResponse.MemberBrief.builder()
                                .userId(m.getUserId())
                                .fullName(m.getFullName())
                                .avatarUrl(m.getAvatarUrl())
                                .roleName(m.getRoleName())
                                .email(m.getEmail())
                                .studentCode(m.getStudentCode())
                                .build()
                ).toList())
                .build();
    }
}
