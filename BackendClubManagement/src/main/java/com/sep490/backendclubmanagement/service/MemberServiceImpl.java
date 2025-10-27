package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.CurrentTermResponse;
import com.sep490.backendclubmanagement.dto.response.MemberHistoryResponse;
import com.sep490.backendclubmanagement.dto.response.MemberResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.repository.ClubRoleRepository;
import com.sep490.backendclubmanagement.repository.RoleMemberShipRepository;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;


@Service
@RequiredArgsConstructor
@Slf4j
public class MemberServiceImpl implements MemberService{

    private final ClubMemberShipRepository clubMemberShipRepository;
    private final SemesterRepository semesterRepository;
    private final RoleMemberShipRepository roleMemberShipRepository;
    private final ClubRoleRepository clubRoleRepository;
    private final UserService userService;


    @Override
    public PageResponse<MemberResponse> getMembersWithFilters(
            Long clubId,
            ClubMemberShipStatus status,
            Long semesterId,
            Long roleId,
            Boolean isActive,
            String searchTerm,
            Pageable pageable) {

        // Get all filtered members
        List<ClubMemberShip> allMembers = clubMemberShipRepository.findMembersWithFiltersList(
                clubId, status, searchTerm);

        // Get semester info if filtering by semester
        Semester targetSemester = null;
        if (semesterId != null) {
            targetSemester = semesterRepository.findById(semesterId).orElse(null);
        } else {
            // Lấy kỳ hiện tại
            targetSemester = semesterRepository.findAll().stream()
                    .filter(Semester::getIsCurrent)
                    .findFirst()
                    .orElse(null);
        }

        final Semester semester = targetSemester;
        final Long effectiveSemesterId = semester != null ? semester.getId() : null;

        List<ClubMemberShip> filteredMembers = allMembers.stream()
                .filter(cms -> {

                    if (semester != null) {
                        boolean joinedBeforeSemesterEnd = cms.getJoinDate().isBefore(semester.getEndDate())
                                || cms.getJoinDate().isEqual(semester.getEndDate());

                        boolean notLeftBeforeSemesterStart = cms.getEndDate() == null
                                || cms.getEndDate().isAfter(semester.getStartDate())
                                || cms.getEndDate().isEqual(semester.getStartDate());

                        if (!joinedBeforeSemesterEnd || !notLeftBeforeSemesterStart) {
                            return false;
                        }
                    }


                    if (roleId != null || isActive != null) {
                        List<RoleMemberShip> relevantRoleMemberships = cms.getRoleMemberships().stream()
                                .filter(rm -> {

                                    if (semester != null && rm.getSemester() != null
                                            && !rm.getSemester().getId().equals(semester.getId())) {
                                        return false;
                                    }
                                    return true;
                                })
                                .toList();


                        if (Boolean.FALSE.equals(isActive)) {
                            return relevantRoleMemberships.isEmpty();
                        }

                        if (Boolean.TRUE.equals(isActive)) {
                            return relevantRoleMemberships.stream()
                                    .anyMatch(rm -> Boolean.TRUE.equals(rm.getIsActive()) &&
                                            (roleId == null || (rm.getClubRole() != null &&
                                                    rm.getClubRole().getId().equals(roleId))));
                        }

                        // ✅ Nếu chỉ filter theo roleId (isActive = null)
                        if (roleId != null) {
                            return relevantRoleMemberships.stream()
                                    .anyMatch(rm -> rm.getClubRole() != null &&
                                            rm.getClubRole().getId().equals(roleId));
                        }
                    }

                    // 3️⃣ Không có filter role/active → pass qua
                    return true;
                })
                .toList();


        log.info("Filtered members: {}", filteredMembers.size());

        // Sort manually based on status
        List<ClubMemberShip> sortedMembers = filteredMembers.stream()
                .sorted((m1, m2) -> {
                    if (status == ClubMemberShipStatus.ACTIVE) {
                        // Sort by role level for active members
                        Integer roleLevel1 = getRoleLevelForSorting(m1, effectiveSemesterId, roleId, isActive);
                        Integer roleLevel2 = getRoleLevelForSorting(m2, effectiveSemesterId, roleId, isActive);

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
                .map(cms -> mapToMemberResponse(cms, semesterId))
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

    @Override
    public PageResponse<MemberResponse> getLeftMembers(
            Long clubId,
            String searchTerm,
            Pageable pageable) {

        // Get all left members with basic filters
        List<ClubMemberShip> allLeftMembers = clubMemberShipRepository.findMembersWithFiltersList(
                clubId, ClubMemberShipStatus.LEFT, searchTerm);

        log.info("Filtered left members: {}", allLeftMembers.size());

        // Sort by end date (most recent departures first), then by name
        List<ClubMemberShip> sortedMembers = allLeftMembers.stream()
                .sorted((m1, m2) -> {
                    // Primary sort by end date (most recent first)
                    if (m1.getEndDate() != null && m2.getEndDate() != null) {
                        int dateComparison = m2.getEndDate().compareTo(m1.getEndDate());
                        if (dateComparison != 0) {
                            return dateComparison;
                        }
                    } else if (m1.getEndDate() != null) {
                        return -1; // m1 has end date, m2 doesn't
                    } else if (m2.getEndDate() != null) {
                        return 1; // m2 has end date, m1 doesn't
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
                .map(cms -> mapToMemberResponse(cms, null)) // No specific semester for left members
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

    @Override
    public void updateMemberRole(Long clubId, Long userId, Long roleId, Long semesterId, Long currentUserId) throws AppException {
        ClubMemberShip cms = clubMemberShipRepository.findByClubIdAndUserId(clubId, userId);
        if (cms == null || cms.getStatus() == ClubMemberShipStatus.LEFT) {
            throw new AppException(ErrorCode.MEMBER_NOT_FOUND);
        }
        Semester semester = resolveSemester(semesterId);
        ClubRole clubRole = clubRoleRepository.findById(roleId)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        
        Long curentUserLogin = userService.getCurrentUserId();
        if (curentUserLogin == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (!curentUserLogin.equals(currentUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        Integer currentUserRoleLevel = getUserRoleLevel(currentUserId, clubId, semesterId);
        validateRoleAssignmentPermission(currentUserRoleLevel, clubRole.getRoleLevel());


        List<RoleMemberShip> rms = roleMemberShipRepository.findByClubMemberShipIdAndSemesterId(cms.getId(), semester.getId());
        RoleMemberShip target = rms.stream().findFirst().orElse(null);
        
        if (target == null) {
            // Create new record if none exists for this semester
            target = new RoleMemberShip();
            target.setClubMemberShip(cms);
            target.setSemester(semester);
        }
        // Update existing record with new role (no duplicate creation)
        target.setClubRole(clubRole);
        target.setIsActive(true);
        roleMemberShipRepository.save(target);
    }

    @Override
    public void updateMemberTeam(Long clubId, Long userId, Long teamId, Long semesterId) throws AppException {
        ClubMemberShip cms = clubMemberShipRepository.findByClubIdAndUserId(clubId, userId);
        if (cms == null || cms.getStatus() == ClubMemberShipStatus.LEFT) {
            throw new AppException(ErrorCode.MEMBER_NOT_FOUND);
        }
        Semester semester = resolveSemester(semesterId);

        // Find existing role membership for this semester - should be only one per member per semester
        List<RoleMemberShip> rms = roleMemberShipRepository.findByClubMemberShipIdAndSemesterId(cms.getId(), semester.getId());
        RoleMemberShip target = rms.stream().findFirst().orElse(null);
        
        if (target == null) {
            // Create new record if none exists for this semester
            target = new RoleMemberShip();
            target.setClubMemberShip(cms);
            target.setSemester(semester);
        }
        // Update existing record with new team (no duplicate creation)
        Team teamRef = new Team();
        teamRef.setId(teamId);
        target.setTeam(teamRef);
        roleMemberShipRepository.save(target);
    }

    @Override
    public void updateMemberActiveStatus(Long clubId, Long userId, boolean isActive, Long semesterId) {
        ClubMemberShip cms = clubMemberShipRepository.findByClubIdAndUserId(clubId, userId);
        if (cms == null || cms.getStatus() == ClubMemberShipStatus.LEFT) {
            throw new IllegalStateException("Member not found or already left club");
        }
        Semester semester = resolveSemester(semesterId);
        List<RoleMemberShip> rms = roleMemberShipRepository.findByClubMemberShipIdAndSemesterId(cms.getId(), semester.getId());

        if (isActive) {
            // Activate: ensure there is at least ONE role membership record in this semester
            RoleMemberShip target = rms.stream().findFirst().orElse(null);
            if (target == null) {
                target = new RoleMemberShip();
                target.setClubMemberShip(cms);
                target.setSemester(semester);
            }
            target.setIsActive(true);
            roleMemberShipRepository.save(target);
        } else {
            // Pause: per business rule, inactive means NO role membership record in that semester
            for (RoleMemberShip rm : rms) {
                roleMemberShipRepository.delete(rm);
            }
        }
    }

    @Override
    public void removeMemberFromClub(Long clubId, Long userId, String reason) {
        ClubMemberShip cms = clubMemberShipRepository.findByClubIdAndUserId(clubId, userId);
        if (cms == null) {
            throw new IllegalStateException("Member not found");
        }
        cms.setStatus(ClubMemberShipStatus.LEFT);
        cms.setEndDate(java.time.LocalDate.now());
        clubMemberShipRepository.save(cms);
    }

    private Semester resolveSemester(Long semesterId) {
        if (semesterId != null) {
            return semesterRepository.findById(semesterId)
                    .orElseThrow(() -> new IllegalArgumentException("Semester not found"));
        }
        return semesterRepository.findAll().stream()
                .filter(Semester::getIsCurrent)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No current semester configured"));
    }




    private Integer getUserRoleLevel(Long userId, Long clubId, Long semesterId) {
        ClubMemberShip cms = clubMemberShipRepository.findByClubIdAndUserId(clubId, userId);
        if (cms == null) {
            return 999; // No membership = lowest priority
        }
        
        Semester semester = resolveSemester(semesterId);
        List<RoleMemberShip> rms = roleMemberShipRepository.findByClubMemberShipIdAndSemesterId(cms.getId(), semester.getId());
        
        return rms.stream()
                .filter(rm -> rm.getClubRole() != null && Boolean.TRUE.equals(rm.getIsActive()))
                .map(rm -> rm.getClubRole().getRoleLevel())
                .min(Integer::compareTo)
                .orElse(999); // No active role = lowest priority
    }


    private void validateRoleAssignmentPermission(Integer currentUserRoleLevel, Integer targetRoleLevel) throws AppException {
        if (currentUserRoleLevel == null || targetRoleLevel == null) {
            throw new AppException(ErrorCode.INSUFFICIENT_PERMISSION);
        }

        if (currentUserRoleLevel >= targetRoleLevel) {
            throw new AppException(ErrorCode.INSUFFICIENT_PERMISSION);
        }
    }

    private Integer getRoleLevelForSorting(ClubMemberShip clubMemberShip, Long effectiveSemesterId, Long roleId, Boolean isActive) {
        // Get all role memberships for the specific semester
        List<RoleMemberShip> relevantRoleMemberships = clubMemberShip.getRoleMemberships().stream()
                .filter(rm -> {
                    // If filtering by semester, only check roles in that semester
                    if (effectiveSemesterId != null && rm.getSemester() != null
                            && !rm.getSemester().getId().equals(effectiveSemesterId)) {
                        return false;
                    }
                    return true;
                })
                .toList();

        // If isActive=false, return a high number (999) since they have no roles
        // Note: When isActive=false, we ignore roleId filter since member has no roles
        if (isActive != null && !isActive) {
            return relevantRoleMemberships.isEmpty() ? 999 : 1000;
        }

        // If isActive=true, find the minimum role level among active roles
        if (isActive != null && isActive) {
            return relevantRoleMemberships.stream()
                    .filter(rm -> Boolean.TRUE.equals(rm.getIsActive()))
                    .filter(rm -> rm.getClubRole() != null)
                    .filter(rm -> roleId == null || rm.getClubRole().getId().equals(roleId))
                    .map(rm -> rm.getClubRole().getRoleLevel())
                    .min(Integer::compareTo)
                    .orElse(999);
        }

        // If only filtering by roleId (isActive is null)
        if (roleId != null) {
            return relevantRoleMemberships.stream()
                    .filter(rm -> rm.getClubRole() != null && rm.getClubRole().getId().equals(roleId))
                    .map(rm -> rm.getClubRole().getRoleLevel())
                    .min(Integer::compareTo)
                    .orElse(999);
        }

        // No filters, return minimum role level
        return relevantRoleMemberships.stream()
                .filter(rm -> rm.getClubRole() != null)
                .map(rm -> rm.getClubRole().getRoleLevel())
                .min(Integer::compareTo)
                .orElse(999);
    }

    private MemberResponse mapToMemberResponse(ClubMemberShip clubMemberShip, Long querySemesterId) {
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

        CurrentTermResponse currentTermResponse = null;

        // If querySemesterId is provided, show info for that specific semester
        if (querySemesterId != null) {
            currentTermResponse = semesterRows.stream()
                    .map(row -> {
                        Semester sem = (Semester) row[0];
                        RoleMemberShip rm = (RoleMemberShip) row[1];
                        if (!sem.getId().equals(querySemesterId)) {
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
        } else {
            // If no specific semester query, show current semester info
            currentTermResponse = semesterRows.stream()
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
        }

        // Fallback: if current term is null or inactive, choose nearest active term from history
        if (currentTermResponse == null || Boolean.FALSE.equals(currentTermResponse.getIsActive())) {
            CurrentTermResponse fallback = null;

            if (querySemesterId != null) {
                // If querying specific semester but no role found, show semester info without role
                fallback = semesterRows.stream()
                        .map(row -> {
                            Semester sem = (Semester) row[0];
                            if (!sem.getId().equals(querySemesterId)) {
                                return null;
                            }
                            return CurrentTermResponse.builder()
                                    .semesterName(sem.getSemesterName())
                                    .semesterCode(sem.getSemesterCode())
                                    .roleName(null)
                                    .roleCode(null)
                                    .roleLevel(null)
                                    .teamName(null)
                                    .attendanceRate(100)
                                    .status(clubMemberShip.getStatus().name())
                                    .isActive(false)
                                    .startDate(sem.getStartDate().toString())
                                    .endDate(sem.getEndDate().toString())
                                    .build();
                        })
                        .filter(r -> r != null)
                        .findFirst()
                        .orElse(null);
            } else {
                // If no specific semester query, find nearest active term from history
                fallback = semesterRows.stream()
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
                                    .isActive(false)
                                    .startDate(sem.getStartDate().toString())
                                    .endDate(sem.getEndDate().toString())
                                    .build();
                        })
                        .filter(r -> r != null)
                        .findFirst()
                        .orElse(null);
            }

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