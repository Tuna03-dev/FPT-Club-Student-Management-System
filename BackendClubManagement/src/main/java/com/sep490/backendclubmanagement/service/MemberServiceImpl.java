package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.CurrentTermResponse;
import com.sep490.backendclubmanagement.dto.response.MemberHistoryResponse;
import com.sep490.backendclubmanagement.dto.response.MemberResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.ClubMemberShip;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
import com.sep490.backendclubmanagement.entity.RoleMemberShip;
import com.sep490.backendclubmanagement.entity.Semester;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;


@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService{

    private final ClubMemberShipRepository clubMemberShipRepository;
    private final SemesterRepository semesterRepository;

    @Override
    public PageResponse<MemberResponse> getMembersByClub(Long clubId, Pageable pageable) {
        Page<ClubMemberShip> memberShipsPage = clubMemberShipRepository.findByClub_Id(clubId, pageable);
        
        List<MemberResponse> memberResponses = memberShipsPage.getContent()
                .stream()
                .map(this::mapToMemberResponse)
                .toList();
        
        return PageResponse.<MemberResponse>builder()
                .content(memberResponses)
                .pageNumber(memberShipsPage.getNumber())
                .pageSize(memberShipsPage.getSize())
                .totalElements(memberShipsPage.getTotalElements())
                .totalPages(memberShipsPage.getTotalPages())
                .hasNext(memberShipsPage.hasNext())
                .hasPrevious(memberShipsPage.hasPrevious())
                .build();
    }

    @Override
    public PageResponse<MemberResponse> getMembersWithFilters(
            Long clubId,
            ClubMemberShipStatus status,
            Long semesterId,
            Long roleId,
            String searchTerm,
            Pageable pageable) {

        // Get all filtered members
        List<ClubMemberShip> allMembers = clubMemberShipRepository.findMembersWithFiltersList(
                clubId, status, semesterId, roleId, searchTerm);

        // Sort manually based on status
        List<ClubMemberShip> sortedMembers = allMembers.stream()
                .sorted((m1, m2) -> {
                    if (status == ClubMemberShipStatus.ACTIVE) {
                        // Sort by role level for active members
                        Integer roleLevel1 = m1.getRoleMemberships().stream()
                                .filter(rm -> rm.getClubRole() != null)
                                .map(rm -> rm.getClubRole().getRoleLevel())
                                .min(Integer::compareTo)
                                .orElse(999);
                        Integer roleLevel2 = m2.getRoleMemberships().stream()
                                .filter(rm -> rm.getClubRole() != null)
                                .map(rm -> rm.getClubRole().getRoleLevel())
                                .min(Integer::compareTo)
                                .orElse(999);

                        int roleComparison = roleLevel1.compareTo(roleLevel2);
                        if (roleComparison != 0) {
                            return roleComparison;
                        }
                    }
                    // Secondary sort by full name
                    return m1.getUser().getFullName().compareTo(m2.getUser().getFullName());
                })
                .toList();

        // Manual pagination
        int totalElements = sortedMembers.size();
        int totalPages = (int) Math.ceil((double) totalElements / pageable.getPageSize());
        int startIndex = pageable.getPageNumber() * pageable.getPageSize();
        int endIndex = Math.min(startIndex + pageable.getPageSize(), totalElements);

        List<ClubMemberShip> pageContent = startIndex < totalElements ?
                sortedMembers.subList(startIndex, endIndex) : List.of();

        List<MemberResponse> memberResponses = pageContent.stream()
                .map(this::mapToMemberResponse)
                .toList();

        return PageResponse.<MemberResponse>builder()
                .content(memberResponses)
                .pageNumber(pageable.getPageNumber())
                .pageSize(pageable.getPageSize())
                .totalElements(totalElements)
                .totalPages(totalPages)
                .hasNext(pageable.getPageNumber() < totalPages - 1)
                .hasPrevious(pageable.getPageNumber() > 0)
                .build();
    }

    private MemberResponse mapToMemberResponse(ClubMemberShip clubMemberShip) {
        User user = clubMemberShip.getUser();

        List<Object[]> semesterRows = semesterRepository.findSemestersWithRoleByMembership(
                clubMemberShip.getId(),
                clubMemberShip.getJoinDate(),
                clubMemberShip.getEndDate()
        );

        long totalTerms = semesterRows.stream()
                .map(row -> ((Semester) row[0]).getId())
                .distinct()
                .count();

        CurrentTermResponse currentTermResponse = semesterRows.stream()
                .map(row -> {
                    Semester sem = (Semester) row[0];
                    RoleMemberShip rm = (RoleMemberShip) row[1];
                    if (!Boolean.TRUE.equals(sem.getIsCurrent())) {
                        return null;
                    }
                    return CurrentTermResponse.builder()
                            .semesterName(sem.getSemesterName())
                            .semesterCode(sem.getSemesterCode())
                            .roleName(rm != null && rm.getClubRole() != null ? rm.getClubRole().getRoleName() : null)
                            .roleCode(rm != null && rm.getClubRole() != null ? rm.getClubRole().getRoleCode() : null)
                            .roleLevel(rm != null && rm.getClubRole() != null ? rm.getClubRole().getRoleLevel() : null)
                            .teamName(rm != null && rm.getTeam() != null ? rm.getTeam().getTeamName() : null)
                            .attendanceRate(100) // TODO: Tính thật dựa trên attendance
                            .status(clubMemberShip.getStatus().name())
                            .isActive(rm != null && Boolean.TRUE.equals(rm.getIsActive()))
                            .startDate(sem.getStartDate().toString())
                            .endDate(sem.getEndDate().toString())
                            .build();
                })
                .filter(r -> r != null)
                .findFirst()
                .orElse(null);

        // Fallback: if current term is null or inactive, choose nearest active term from history
        if (currentTermResponse == null || Boolean.FALSE.equals(currentTermResponse.getIsActive())) {
            CurrentTermResponse fallback = semesterRows.stream()
                    .map(row -> {
                        Semester sem = (Semester) row[0];
                        RoleMemberShip rm = (RoleMemberShip) row[1];
                        if (rm == null || !Boolean.TRUE.equals(rm.getIsActive())) return null;
                        return CurrentTermResponse.builder()
                                .semesterName(sem.getSemesterName())
                                .semesterCode(sem.getSemesterCode())
                                .roleName(rm.getClubRole() != null ? rm.getClubRole().getRoleName() : null)
                                .roleCode(rm.getClubRole() != null ? rm.getClubRole().getRoleCode() : null)
                                .roleLevel(rm.getClubRole() != null ? rm.getClubRole().getRoleLevel() : null)
                                .teamName(rm.getTeam() != null ? rm.getTeam().getTeamName() : null)
                                .attendanceRate(100)
                                .status(clubMemberShip.getStatus().name())
                                .isActive(true)
                                .startDate(sem.getStartDate().toString())
                                .endDate(sem.getEndDate().toString())
                                .build();
                    })
                    .filter(r -> r != null)
                    .findFirst()
                    .orElse(null);
            if (fallback != null) {
                currentTermResponse = fallback;
            }
        }

        Set<String> seen = new HashSet<>();
        List<MemberHistoryResponse> history = semesterRows.stream()
                .map(row -> {
                    Semester sem = (Semester) row[0];
                    RoleMemberShip rm = (RoleMemberShip) row[1];
                    return MemberHistoryResponse.builder()
                            .semesterName(sem.getSemesterName())
                            .semesterCode(sem.getSemesterCode())
                            .roleName(rm != null && rm.getClubRole() != null ? rm.getClubRole().getRoleName() : null)
                            .roleCode(rm != null && rm.getClubRole() != null ? rm.getClubRole().getRoleCode() : null)
                            .roleLevel(rm != null && rm.getClubRole() != null ? rm.getClubRole().getRoleLevel() : null)
                            .teamName(rm != null && rm.getTeam() != null ? rm.getTeam().getTeamName() : null)
                            .status(clubMemberShip.getStatus().name())
                            .isActive(rm != null && Boolean.TRUE.equals(rm.getIsActive()))
                            .startDate(sem.getStartDate().toString())
                            .endDate(sem.getEndDate().toString())
                            .build();
                })
                .filter(h -> {
                    String key = h.getSemesterCode();
                    return seen.add(key);
                })
                .toList();

        return MemberResponse.builder()
                .userId(user.getId())
                .studentCode(user.getStudentCode())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .avatarUrl(user.getAvatarUrl())
                .gender(user.getGender())
                .dateOfBirth(user.getDateOfBirth() != null ? user.getDateOfBirth().toString() : null)
                .clubName(clubMemberShip.getClub().getClubName())
                .clubCode(clubMemberShip.getClub().getClubCode())
                .membershipStatus(clubMemberShip.getStatus().name())
                .joinDate(clubMemberShip.getJoinDate().toString())
                .endDate(clubMemberShip.getEndDate() != null ? clubMemberShip.getEndDate().toString() : null)
                .totalAttendanceRate(90) // TODO: Tính thật
                .totalTerms((int) totalTerms)
                .lastActive("2025-10-18") // TODO: Lấy từ hoạt động gần nhất
                .currentTerm(currentTermResponse)
                .history(history)
                .build();
    }
}
