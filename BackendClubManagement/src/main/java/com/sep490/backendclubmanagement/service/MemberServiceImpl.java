package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.CurrentTermResponse;
import com.sep490.backendclubmanagement.dto.response.ImportMemberError;
import com.sep490.backendclubmanagement.dto.response.ImportMembersResponse;
import com.sep490.backendclubmanagement.dto.response.MemberHistoryResponse;
import com.sep490.backendclubmanagement.dto.response.MemberResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.dto.response.SimpleMemberResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.*;


@Service
@RequiredArgsConstructor
@Slf4j
public class MemberServiceImpl implements MemberService{

    private final ClubMemberShipRepository clubMemberShipRepository;
    private final SemesterRepository semesterRepository;
    private final RoleMemberShipRepository roleMemberShipRepository;
    private final ClubRoleRepository clubRoleRepository;
    private final UserService userService;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final TeamRepository teamRepository;
    private final NotificationService notificationService;
    private final FapApiService fapApiService;

    /**
     * Helper method để đảm bảo chỉ có 1 RoleMemberShip cho mỗi member trong mỗi semester
     * QUAN TRỌNG: Chỉ tạo mới RoleMemberShip khi semester đang là current semester (isCurrent = true)
     * Nếu semester không phải current, chỉ update bản ghi đã tồn tại, không tạo mới
     * 
     * @param membership ClubMemberShip
     * @param semester Semester
     * @return RoleMemberShip duy nhất cho member trong semester này, hoặc null nếu không tồn tại và semester không phải current
     */
    private RoleMemberShip getOrCreateSingleRoleMemberShip(ClubMemberShip membership, Semester semester) {
        // Tìm tất cả RoleMemberShip cho member này trong semester này
        List<RoleMemberShip> existingRms = roleMemberShipRepository.findByClubMemberShipIdAndSemesterId(
                membership.getId(), semester.getId());
        
        if (existingRms.isEmpty()) {
            // Chưa có bản ghi
            // ✅ CHỈ TẠO MỚI KHI SEMESTER ĐANG LÀ CURRENT SEMESTER
            if (semester.getIsCurrent() != null && semester.getIsCurrent()) {
                // Semester đang hoạt động, được phép tạo mới
                RoleMemberShip newRm = new RoleMemberShip();
                newRm.setClubMemberShip(membership);
                newRm.setSemester(semester);
                newRm.setIsActive(true);
                return newRm;
            } else {
                // Semester không phải current, không được tạo mới
                log.warn("[RoleMemberShip] Cannot create new RoleMemberShip for member {} in non-current semester {} (semesterCode: {}). Only current semester allows creating new records.",
                        membership.getUser().getId(), semester.getId(), semester.getSemesterCode());
                return null; // Trả về null để caller xử lý
            }
        } else if (existingRms.size() == 1) {
            // Đã có đúng 1 bản ghi, trả về bản ghi đó (cho phép update)
            return existingRms.get(0);
        } else {
            // Có nhiều bản ghi trùng lặp - xóa các bản ghi thừa, giữ lại bản ghi đầu tiên (id nhỏ nhất)
            log.warn("[RoleMemberShip] Found {} duplicate RoleMemberShip records for member {} (clubMembershipId: {}) in semester {}. Cleaning up...",
                    existingRms.size(), membership.getUser().getId(), membership.getId(), semester.getId());
            
            RoleMemberShip toKeep = existingRms.get(0); // Giữ lại bản ghi đầu tiên (id nhỏ nhất)
            
            // Xóa các bản ghi trùng lặp
            for (int i = 1; i < existingRms.size(); i++) {
                roleMemberShipRepository.delete(existingRms.get(i));
                log.info("[RoleMemberShip] Deleted duplicate RoleMemberShip with id: {}", existingRms.get(i).getId());
            }
            
            return toKeep;
        }
    }

    /**
     * Helper method để lấy ClubMemberShip và xử lý trường hợp trùng lặp
     * @param clubId Club ID
     * @param userId User ID
     * @return ClubMemberShip đầu tiên (id nhỏ nhất) nếu tồn tại
     * @throws AppException nếu không tìm thấy hoặc đã LEFT
     */
    private ClubMemberShip getClubMemberShipOrThrow(Long clubId, Long userId) throws AppException {
        List<ClubMemberShip> cmsList = clubMemberShipRepository.findByClubIdAndUserIdList(clubId, userId);
        if (cmsList == null || cmsList.isEmpty()) {
            throw new AppException(ErrorCode.MEMBER_NOT_FOUND);
        }
        
        ClubMemberShip cms = cmsList.get(0);
        if (cms.getStatus() == ClubMemberShipStatus.LEFT) {
            throw new AppException(ErrorCode.MEMBER_NOT_FOUND, "Thành viên đã rời CLB");
        }
        
        // ✅ Xử lý trùng lặp: nếu có nhiều ClubMemberShip, xóa các bản ghi trùng lặp
        if (cmsList.size() > 1) {
            log.warn("[Member] Found {} duplicate ClubMemberShip records for user {} in club {}. Keeping the first one (id: {}) and cleaning up duplicates...",
                    cmsList.size(), userId, clubId, cms.getId());
            for (int i = 1; i < cmsList.size(); i++) {
                ClubMemberShip duplicate = cmsList.get(i);
                // Xóa các bản ghi trùng lặp, giữ lại bản ghi cũ nhất (id nhỏ nhất)
                clubMemberShipRepository.delete(duplicate);
                log.info("[Member] Deleted duplicate ClubMemberShip with id: {} for user {} in club {}", 
                        duplicate.getId(), userId, clubId);
            }
        }
        
        return cms;
    }


    @Override
    public PageResponse<MemberResponse> getMembersWithFilters(
            Long clubId,
            ClubMemberShipStatus status,
            Long semesterId,
            Long roleId,
            Boolean isActive,
            String searchTerm,
            Pageable pageable) {

        // 🚀 OPTIMIZED: Lấy semesterId hiện tại nếu không được chỉ định
        final Long effectiveSemesterId; // Must be final for lambda
        if (semesterId == null) {
            // Chỉ query 1 lần để lấy current semester
            Semester currentSemester = semesterRepository.findAll().stream()
                    .filter(Semester::getIsCurrent)
                    .findFirst()
                    .orElse(null);
            effectiveSemesterId = currentSemester != null ? currentSemester.getId() : null;
        } else {
            effectiveSemesterId = semesterId;
        }

        // Normalize search term
        final String normalizedSearch = (searchTerm != null && !searchTerm.trim().isEmpty())
                ? searchTerm.trim()
                : null;

        List<ClubMemberShip> filteredMembers;
        long totalFilteredElements;
        int pageSize = pageable.getPageSize();
        int currentPage = pageable.getPageNumber();
        
        if (normalizedSearch != null) {
            // ✅ FIX: Khi có search, query TẤT CẢ records matching filters (không pagination)
            // Sau đó filter trong Java và paginate trong Java để đảm bảo chính xác
            List<ClubMemberShip> allMatchingMembers = clubMemberShipRepository.findMembersWithFiltersOptimized(
                    clubId,
                    status,
                    effectiveSemesterId,
                    roleId,
                    isActive,
                    org.springframework.data.domain.Pageable.unpaged() // Query tất cả, không pagination
            ).getContent();
            
            // 🔍 SEARCH FILTER: Filter theo searchTerm trong Java với accent-insensitive
            filteredMembers = allMatchingMembers.stream()
                    .filter(cms -> com.sep490.backendclubmanagement.util.VietnameseTextNormalizer.matchesAny(
                            normalizedSearch,
                            cms.getUser().getFullName(),
                            cms.getUser().getStudentCode()
                    ))
                    .toList();
            
            totalFilteredElements = filteredMembers.size();
            
            // Paginate trong Java sau khi filter
            int start = currentPage * pageSize;
            int end = Math.min(start + pageSize, filteredMembers.size());
            filteredMembers = filteredMembers.subList(start, end);
            
            log.debug("[Member] Search filter applied: {} total matches, showing page {} ({} items)", 
                    totalFilteredElements, currentPage + 1, filteredMembers.size());
        } else {
            // ✅ OPTIMIZED: Không có search, dùng pagination từ database (hiệu quả hơn)
            org.springframework.data.domain.Page<ClubMemberShip> memberPage =
                    clubMemberShipRepository.findMembersWithFiltersOptimized(
                            clubId,
                            status,
                            effectiveSemesterId,
                            roleId,
                            isActive,
                            pageable
                    );
            
            filteredMembers = memberPage.getContent();
            totalFilteredElements = memberPage.getTotalElements();
        }

        // 🚀 OPTIMIZED: Map các entities đã được JOIN FETCH loaded
        List<MemberResponse> memberResponses = filteredMembers.stream()
                .map(cms -> mapToMemberResponse(cms, effectiveSemesterId))
                .toList();

        // Tính lại pagination metadata dựa trên filtered results
        int totalPages = (int) Math.ceil((double) totalFilteredElements / pageSize);
        boolean hasNext = currentPage < totalPages - 1;
        boolean hasPrevious = currentPage > 0;

        return PageResponse.<MemberResponse>builder()
                .content(memberResponses)
                .pageNumber(currentPage)
                .pageSize(pageSize)
                .totalElements(totalFilteredElements)
                .totalPages(totalPages)
                .hasNext(hasNext)
                .hasPrevious(hasPrevious)
                .build();
    }

    @Override
    public PageResponse<MemberResponse> getLeftMembers(
            Long clubId,
            String searchTerm,
            Pageable pageable) {

        // Normalize search term
        final String normalizedSearch = (searchTerm != null && !searchTerm.trim().isEmpty())
                ? searchTerm.trim()
                : null;

        List<ClubMemberShip> filteredMembers;
        long totalFilteredElements;
        int pageSize = pageable.getPageSize();
        int currentPage = pageable.getPageNumber();
        
        if (normalizedSearch != null) {
            // ✅ FIX: Khi có search, query TẤT CẢ left members (không pagination)
            // Sau đó filter trong Java và paginate trong Java để đảm bảo chính xác
            List<ClubMemberShip> allLeftMembers = clubMemberShipRepository.findLeftMembersOptimized(
                    clubId,
                    org.springframework.data.domain.Pageable.unpaged() // Query tất cả, không pagination
            ).getContent();
            
            // 🔍 SEARCH FILTER: Filter theo searchTerm trong Java với accent-insensitive
            filteredMembers = allLeftMembers.stream()
                    .filter(cms -> com.sep490.backendclubmanagement.util.VietnameseTextNormalizer.matchesAny(
                            normalizedSearch,
                            cms.getUser().getFullName(),
                            cms.getUser().getStudentCode()
                    ))
                    .toList();
            
            totalFilteredElements = filteredMembers.size();
            
            // Paginate trong Java sau khi filter
            int start = currentPage * pageSize;
            int end = Math.min(start + pageSize, filteredMembers.size());
            filteredMembers = filteredMembers.subList(start, end);
            
            log.debug("[Member] Search filter applied for left members: {} total matches, showing page {} ({} items)", 
                    totalFilteredElements, currentPage + 1, filteredMembers.size());
        } else {
            // ✅ OPTIMIZED: Không có search, dùng pagination từ database (hiệu quả hơn)
            org.springframework.data.domain.Page<ClubMemberShip> memberPage =
                    clubMemberShipRepository.findLeftMembersOptimized(
                            clubId,
                            pageable
                    );
            
            filteredMembers = memberPage.getContent();
            totalFilteredElements = memberPage.getTotalElements();
        }

        // 🚀 OPTIMIZED: Map các entities đã được JOIN FETCH loaded
        List<MemberResponse> memberResponses = filteredMembers.stream()
                .map(cms -> mapToMemberResponse(cms, null)) // No specific semester for left members
                .toList();

        // Tính lại pagination metadata
        int totalPages = (int) Math.ceil((double) totalFilteredElements / pageSize);
        boolean hasNext = currentPage < totalPages - 1;
        boolean hasPrevious = currentPage > 0;

        return PageResponse.<MemberResponse>builder()
                .content(memberResponses)
                .pageNumber(currentPage)
                .pageSize(pageSize)
                .totalElements(totalFilteredElements)
                .totalPages(totalPages)
                .hasNext(hasNext)
                .hasPrevious(hasPrevious)
                .build();
    }

    @Override
    public void updateMemberRole(Long clubId, Long userId, Long roleId, Long semesterId, Long currentUserId) throws AppException {
        ClubMemberShip cms = getClubMemberShipOrThrow(clubId, userId);
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


        // ✅ FIX: Sử dụng helper method để đảm bảo chỉ có 1 RoleMemberShip
        RoleMemberShip target = getOrCreateSingleRoleMemberShip(cms, semester);
        if (target == null) {
            throw new AppException(ErrorCode.INVALID_INPUT, 
                "Không thể cập nhật vai trò cho kỳ học không phải kỳ hiện tại. Chỉ có thể cập nhật vai trò cho kỳ học đang hoạt động.");
        }

        // ✅ VALIDATION: Kiểm tra nếu đang thay đổi từ CLUB_PRESIDENT sang role khác
        // Club phải luôn có ít nhất 1 chủ nhiệm
        ClubRole currentRole = target.getClubRole();
        boolean isCurrentlyPresident = currentRole != null && "CLUB_PRESIDENT".equals(currentRole.getRoleCode());
        boolean willBePresident = "CLUB_PRESIDENT".equals(clubRole.getRoleCode());
        
        if (isCurrentlyPresident && !willBePresident) {
            // Kiểm tra xem club còn chủ nhiệm nào khác không (trừ user hiện tại)
            long otherPresidentsCount = roleMemberShipRepository.countActivePresidentsInClubExcludingUser(
                    clubId, semester.getId(), userId);
            
            if (otherPresidentsCount == 0) {
                throw new AppException(ErrorCode.INVALID_INPUT, 
                    "Câu lạc bộ phải có ít nhất 1 chủ nhiệm. Hiện tại bạn là chủ nhiệm duy nhất. " +
                    "Vui lòng gán chủ nhiệm cho thành viên khác trước khi thay đổi vai trò của bạn.");
            }
        }

        // Update existing record with new role
        target.setClubRole(clubRole);
        target.setIsActive(true);
        roleMemberShipRepository.save(target);

        // 🔔 Gửi notification cho member được assign role
        try {
            if (!userId.equals(currentUserId)) {
                // Không gửi notification nếu tự assign role cho mình
                Club club = clubRepository.findById(clubId).orElse(null);
                if (club != null) {
                    String title = "Bạn đã được gán vai trò mới trong " + club.getClubName();
                    String message = "Vai trò: " + clubRole.getRoleName();
                    String actionUrl = "/myclub/" + clubId + "/members";

                    notificationService.sendToUser(
                            userId,
                            currentUserId, // actor (người thực hiện assign)
                            title,
                            message,
                            NotificationType.CLUB_ROLE_ASSIGNED,
                            NotificationPriority.NORMAL,
                            actionUrl,
                            clubId,
                            null, // relatedNewsId
                            null, // relatedTeamId
                            null, // relatedRequestId
                            null  // relatedEventId
                    );

                    log.info("[Member] Notification sent to user {}: role assigned {}", userId, clubRole.getRoleName());
                }
            }
        } catch (Exception e) {
            log.error("[Member] Failed to send role assignment notification: {}", e.getMessage(), e);
            // Don't throw - notification failure shouldn't break role assignment
        }
    }

    @Override
    @Transactional
    public void updateMemberTeam(Long clubId, Long userId, Long teamId, Long semesterId) throws AppException {
        ClubMemberShip cms = getClubMemberShipOrThrow(clubId, userId);

        // ✅ FIX: Validate team exists và thuộc về club này
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new AppException(ErrorCode.TEAM_NOT_FOUND));

        if (!team.getClub().getId().equals(clubId)) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Team does not belong to this club");
        }

        Semester semester = resolveSemester(semesterId);

        // ✅ FIX: Sử dụng helper method để đảm bảo chỉ có 1 RoleMemberShip
        // Chỉ update bản ghi hiện tại, không ảnh hưởng đến các bản ghi khác (nếu có)
        RoleMemberShip target = getOrCreateSingleRoleMemberShip(cms, semester);
        if (target == null) {
            throw new AppException(ErrorCode.INVALID_INPUT, 
                "Không thể phân ban cho kỳ học không phải kỳ hiện tại. Chỉ có thể phân ban cho kỳ học đang hoạt động.");
        }

        // ✅ CHỈ UPDATE BẢN GHI HIỆN TẠI: Chỉ update team cho bản ghi RoleMemberShip này
        // Không ảnh hưởng đến các RoleMemberShip khác (nếu có) trong cùng semester
        target.setTeam(team);
        target.setIsActive(true); // ✅ Đảm bảo active khi assign team
        roleMemberShipRepository.save(target);
        
        log.info("[Member] Updated team for user {} in club {} semester {}: teamId={}", 
                userId, clubId, semester.getSemesterCode(), teamId);
    }

    @Override
    @Transactional
    public void updateMemberActiveStatus(Long clubId, Long userId, boolean isActive, Long semesterId) {
        // ✅ FIX: Sử dụng helper method để xử lý trùng lặp
        ClubMemberShip cms;
        try {
            cms = getClubMemberShipOrThrow(clubId, userId);
        } catch (AppException e) {
            throw new IllegalStateException("Không tìm thấy thành viên hoặc thành viên đã rời câu lạc bộ");
        }
        
        Semester semester = resolveSemester(semesterId);
        
        if (isActive) {
            // Activate: ensure there is at least ONE role membership record in this semester
            // ✅ FIX: Sử dụng helper method để đảm bảo chỉ có 1 RoleMemberShip
            RoleMemberShip target = getOrCreateSingleRoleMemberShip(cms, semester);
            if (target == null) {
                throw new IllegalStateException("Không thể kích hoạt thành viên cho kỳ học không phải kỳ hiện tại. Chỉ có thể kích hoạt cho kỳ học đang hoạt động.");
            }
            target.setIsActive(true);
            roleMemberShipRepository.save(target);
        } else {
            // Pause: per business rule, inactive means set isActive = false
            // ✅ FIX: Chỉ update nếu đã có bản ghi, không tạo mới cho kỳ không phải current
            List<RoleMemberShip> rms = roleMemberShipRepository.findByClubMemberShipIdAndSemesterId(cms.getId(), semester.getId());
            if (rms.isEmpty()) {
                // Không có bản ghi và semester không phải current -> không làm gì
                log.info("[Member] Cannot deactivate member {} in non-current semester {} (semesterCode: {}). No record exists.",
                        userId, semester.getId(), semester.getSemesterCode());
                return;
            }
            // Có bản ghi, set inactive
            RoleMemberShip target = rms.get(0);
            if (rms.size() > 1) {
                // Xóa các bản ghi trùng lặp
                for (int i = 1; i < rms.size(); i++) {
                    roleMemberShipRepository.delete(rms.get(i));
                }
            }
            target.setIsActive(false);
            roleMemberShipRepository.save(target);
        }
    }

    @Override
    @Transactional
    public void removeMemberFromClub(Long clubId, Long userId, String reason) {
        // ✅ FIX: Sử dụng helper method để xử lý trùng lặp
        List<ClubMemberShip> cmsList = clubMemberShipRepository.findByClubIdAndUserIdList(clubId, userId);
        if (cmsList == null || cmsList.isEmpty()) {
            log.warn("[Member] Attempted to remove non-existent member: userId={}, clubId={}", userId, clubId);
            return; // Không throw exception để tránh lỗi nếu member đã bị xóa
        }
        ClubMemberShip cms = cmsList.get(0);
        if (cms == null) {
            throw new IllegalStateException("Không tìm thấy thành viên");
        }
        cms.setStatus(ClubMemberShipStatus.LEFT);
        cms.setEndDate(java.time.LocalDate.now());
        clubMemberShipRepository.save(cms);

        // ✅ FIX: CHỈ deactivate RoleMemberShip của KỲ HIỆN TẠI (giữ lại lịch sử các kỳ trước)
        Semester currentSemester = semesterRepository.findAll().stream()
                .filter(Semester::getIsCurrent)
                .findFirst()
                .orElse(null);

        if (currentSemester != null) {
            List<RoleMemberShip> currentSemesterMemberships = roleMemberShipRepository
                    .findByClubMemberShipIdAndSemesterId(cms.getId(), currentSemester.getId());

            for (RoleMemberShip rm : currentSemesterMemberships) {
                rm.setIsActive(false);
                roleMemberShipRepository.save(rm);
            }

            log.info("[Member] Deactivated {} RoleMemberShip records in current semester for removed member {} from club {}",
                    currentSemesterMemberships.size(), userId, clubId);
        } else {
            log.warn("[Member] No current semester found, cannot deactivate RoleMemberShip for removed member {} from club {}",
                    userId, clubId);
        }

        // 🔔 Gửi notification cho member bị remove
        try {
            Club club = clubRepository.findById(clubId).orElse(null);
            if (club != null) {
                String title = "Bạn đã bị xóa khỏi " + club.getClubName();
                String message = reason != null && !reason.trim().isEmpty()
                        ? "Lý do: " + reason
                        : "Bạn không còn là thành viên của câu lạc bộ này";
                String actionUrl = "/clubs";

                notificationService.sendToUser(
                        userId,
                        null, // actor (system/admin)
                        title,
                        message,
                        NotificationType.CLUB_MEMBER_REMOVED,
                        NotificationPriority.HIGH,
                        actionUrl,
                        clubId,
                        null, // relatedNewsId
                        null, // relatedTeamId
                        null, // relatedRequestId
                        null  // relatedEventId
                );

                log.info("[Member] Notification sent to user {}: removed from club {}", userId, clubId);
            }
        } catch (Exception e) {
            log.error("[Member] Failed to send removal notification: {}", e.getMessage(), e);
            // Don't throw - notification failure shouldn't break member removal
        }
    }

    private Semester resolveSemester(Long semesterId) {
        if (semesterId != null) {
            return semesterRepository.findById(semesterId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy kỳ học"));
        }
        return semesterRepository.findAll().stream()
                .filter(Semester::getIsCurrent)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Chưa cấu hình kỳ học hiện tại"));
    }




    private Integer getUserRoleLevel(Long userId, Long clubId, Long semesterId) {
        List<ClubMemberShip> cmsList = clubMemberShipRepository.findByClubIdAndUserIdList(clubId, userId);
        if (cmsList == null || cmsList.isEmpty()) {
            return 999; // No membership = lowest priority
        }
        ClubMemberShip cms = cmsList.get(0); // Lấy bản ghi đầu tiên
        
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


        if (currentUserRoleLevel > targetRoleLevel) {
            throw new AppException(ErrorCode.INSUFFICIENT_PERMISSION,
                "Bạn không có quyền gán vai trò cao hơn vai trò hiện tại của mình");
        }
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

    @Override
    public List<SimpleMemberResponse> getAllActiveMembersForSelection(Long clubId) {
        // Get all members that are currently ACTIVE (not LEFT)
        List<ClubMemberShip> activeMembers = clubMemberShipRepository.findByClubIdAndStatus(
                clubId,
                ClubMemberShipStatus.ACTIVE
        );

        // Map to simple response with only basic info needed for selection
        return activeMembers.stream()
                .map(cms -> {
                    User user = cms.getUser();
                    return SimpleMemberResponse.builder()
                            .userId(user.getId())
                            .studentCode(user.getStudentCode())
                            .fullName(user.getFullName())
                            .email(user.getEmail())
                            .avatarUrl(user.getAvatarUrl())
                            .build();
                })
                .toList();
    }

    @Override
    @Transactional
    public ImportMembersResponse importMembersFromExcel(Long clubId, MultipartFile file, Long currentUserId) throws Exception {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));

        int totalRows = 0;
        int processedUsers = 0;
        int processedHistories = 0;
        int createdUsers = 0;
        int updatedUsers = 0;
        int createdMemberships = 0;
        int updatedMemberships = 0;
        int createdRoleMemberships = 0;
        int updatedRoleMemberships = 0;
        List<ImportMemberError> errors = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook wb = new XSSFWorkbook(is)) {
            Sheet sheet = wb.getSheetAt(0);
            if (sheet.getPhysicalNumberOfRows() < 2) {
                throw new AppException(ErrorCode.INVALID_INPUT, "File Excel phải có ít nhất 1 dòng dữ liệu (không tính dòng tiêu đề)");
            }

            // Map headers
            Row header = sheet.getRow(0);
            if (header == null) {
                throw new AppException(ErrorCode.INVALID_INPUT, "File Excel không có dòng tiêu đề");
            }
            Map<String, Integer> colIndex = new HashMap<>();
            for (Cell c : header) {
                String key = c.getStringCellValue().trim().toLowerCase();
                colIndex.put(key, c.getColumnIndex());
            }

            // Required headers
            String[] required = {"student_code", "full_name", "semester_code"};
            List<String> missingHeaders = new ArrayList<>();
            for (String r : required) {
                if (!colIndex.containsKey(r)) {
                    missingHeaders.add(r);
                }
            }
            if (!missingHeaders.isEmpty()) {
                throw new AppException(ErrorCode.INVALID_INPUT, 
                    "File Excel thiếu các cột bắt buộc: " + String.join(", ", missingHeaders));
            }

            // ✅ OPTIMIZATION: Pre-load và cache data để tránh N+1 queries
            int lastRow = sheet.getLastRowNum();
            
            // 1. Collect all student codes, semester codes, role codes, team names, emails
            Set<String> allStudentCodes = new HashSet<>();
            Set<String> allSemesterCodes = new HashSet<>();
            Set<String> allRoleCodes = new HashSet<>();
            Set<String> allTeamNames = new HashSet<>();
            Set<String> allEmails = new HashSet<>();
            
            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                
                String studentCode = readCell(row, colIndex.get("student_code"));
                String semesterCode = readCell(row, colIndex.get("semester_code"));
                String roleCode = colIndex.containsKey("role_code") ? readCell(row, colIndex.get("role_code")) : null;
                String teamName = colIndex.containsKey("team_name") ? readCell(row, colIndex.get("team_name")) : null;
                String email = colIndex.containsKey("email") ? readCell(row, colIndex.get("email")) : null;
                
                if (studentCode != null && !studentCode.isEmpty()) {
                    allStudentCodes.add(studentCode);
                }
                if (semesterCode != null && !semesterCode.isEmpty()) {
                    allSemesterCodes.add(semesterCode);
                }
                if (roleCode != null && !roleCode.isEmpty()) {
                    allRoleCodes.add(roleCode);
                }
                if (teamName != null && !teamName.isEmpty()) {
                    allTeamNames.add(teamName);
                }
                if (email != null && !email.isEmpty()) {
                    allEmails.add(email);
                }
            }
            
            // 2. Batch load và cache
            Map<String, User> userMap = new HashMap<>();
            if (!allStudentCodes.isEmpty()) {
                List<User> existingUsers = userRepository.findByStudentCodeIn(new ArrayList<>(allStudentCodes));
                for (User u : existingUsers) {
                    userMap.put(u.getStudentCode(), u);
                }
            }
            
            Map<String, Semester> semesterMap = new HashMap<>();
            for (String code : allSemesterCodes) {
                semesterRepository.findBySemesterCode(code).ifPresent(s -> semesterMap.put(code, s));
            }
            
            Map<String, ClubRole> roleMap = new HashMap<>();
            for (String code : allRoleCodes) {
                clubRoleRepository.findByClubIdAndRoleCode(clubId, code).ifPresent(r -> roleMap.put(code, r));
            }
            
            Map<String, Team> teamMap = new HashMap<>();
            for (String name : allTeamNames) {
                teamRepository.findByClubIdAndTeamName(clubId, name).ifPresent(t -> teamMap.put(name, t));
            }
            
            // 3. Cache FAP API responses để tránh duplicate calls
            Map<String, Boolean> emailValidationCache = new HashMap<>();
            
            // Track processed users
            Set<String> processedUserCodes = new HashSet<>();
            
            // Batch collections for save
            List<User> usersToCreate = new ArrayList<>();
            List<User> usersToUpdate = new ArrayList<>();
            List<ClubMemberShip> membershipsToCreate = new ArrayList<>();
            List<ClubMemberShip> membershipsToUpdate = new ArrayList<>();
            List<RoleMemberShip> roleMembershipsToSave = new ArrayList<>();
            List<ClubMemberShip> duplicateMembershipsToDelete = new ArrayList<>();
            
            // ✅ FIX: Track để tránh duplicate trong cùng batch
            Set<String> studentCodesInBatch = new HashSet<>();
            Set<String> emailsInBatch = new HashSet<>();
            
            int batchSize = 50; // Flush every 50 rows
            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                totalRows++;

                try {
                    String studentCode = readCell(row, colIndex.get("student_code"));
                    String fullName = readCell(row, colIndex.get("full_name"));
                    String semesterCode = readCell(row, colIndex.get("semester_code"));
                    String email = colIndex.containsKey("email") ? readCell(row, colIndex.get("email")) : null;
                    String phone = colIndex.containsKey("phone") ? readCell(row, colIndex.get("phone")) : null;
                    String roleCode = colIndex.containsKey("role_code") ? readCell(row, colIndex.get("role_code")) : null;
                    String teamName = colIndex.containsKey("team_name") ? readCell(row, colIndex.get("team_name")) : null;
                    String isActiveStr = colIndex.containsKey("is_active") ? readCell(row, colIndex.get("is_active")) : "true";
                    String joinDateStr = colIndex.containsKey("join_date") ? readCell(row, colIndex.get("join_date")) : null;

                    if (studentCode == null || studentCode.isEmpty()) {
                        throw new IllegalArgumentException("Mã sinh viên không được để trống");
                    }
                    if (semesterCode == null || semesterCode.isEmpty()) {
                        throw new IllegalArgumentException("Mã học kỳ không được để trống");
                    }

                    // ✅ OPTIMIZATION: Sử dụng cached data
                    // Validate email với cache
                    if (email != null && !email.isEmpty()) {
                        Boolean isValid = emailValidationCache.get(email);
                        if (isValid == null) {
                            var profile = fapApiService.findProfileByEmail(email);
                            isValid = profile.isPresent();
                            emailValidationCache.put(email, isValid);
                        }
                        if (!isValid) {
                            throw new IllegalArgumentException("Email " + email + " không có trong danh sách người dùng được phép");
                        }
                    }

                    // Find user from cache
                    User user = userMap.get(studentCode);
                    boolean userCreated = false;
                    if (user == null) {
                        // ✅ FIX: Kiểm tra duplicate trong batch trước khi tạo
                        // Kiểm tra duplicate student_code
                        if (studentCode != null && !studentCode.isEmpty() && studentCodesInBatch.contains(studentCode)) {
                            throw new IllegalArgumentException(
                                String.format("Mã sinh viên '%s' bị trùng lặp trong file Excel (dòng %d). Mỗi mã sinh viên chỉ được xuất hiện một lần.", 
                                    studentCode, r + 1));
                        }
                        
                        // Kiểm tra duplicate email
                        if (email != null && !email.isEmpty() && emailsInBatch.contains(email.toLowerCase())) {
                            throw new IllegalArgumentException(
                                String.format("Email '%s' bị trùng lặp trong file Excel (dòng %d). Mỗi email chỉ được xuất hiện một lần.", 
                                    email, r + 1));
                        }
                        
                        // Kiểm tra email đã tồn tại trong database (ngoài cache)
                        if (email != null && !email.isEmpty()) {
                            Optional<User> existingUserByEmail = userRepository.findByEmailIgnoreCase(email);
                            if (existingUserByEmail.isPresent()) {
                                // User đã tồn tại với email này, nhưng khác student_code
                                // Có thể là trường hợp user đã có email nhưng chưa có student_code
                                User existingUser = existingUserByEmail.get();
                                if (existingUser.getStudentCode() == null || existingUser.getStudentCode().isEmpty()) {
                                    // User chưa có student_code, update thay vì tạo mới
                                    existingUser.setStudentCode(studentCode);
                                    userMap.put(studentCode, existingUser); // Update cache
                                    user = existingUser;
                                    usersToUpdate.add(user);
                                    updatedUsers++;
                                } else {
                                    throw new IllegalArgumentException(
                                        String.format("Email '%s' đã được sử dụng bởi mã sinh viên khác (%s) trong hệ thống (dòng %d).", 
                                            email, existingUser.getStudentCode(), r + 1));
                                }
                            } else {
                                // Tạo user mới
                                user = User.builder()
                                        .studentCode(studentCode)
                                        .fullName(fullName)
                                        .email(email)
                                        .phoneNumber(phone)
                                        .isActive(true)
                                        .build();
                                usersToCreate.add(user);
                                if (studentCode != null && !studentCode.isEmpty()) {
                                    studentCodesInBatch.add(studentCode);
                                }
                                if (email != null && !email.isEmpty()) {
                                    emailsInBatch.add(email.toLowerCase());
                                }
                                userCreated = true;
                                createdUsers++;
                            }
                        } else {
                            // Không có email trong Excel
                            // User entity yêu cầu email NOT NULL, nên cần tạo email tạm thời hoặc bỏ qua
                            // Tạo email tạm thời dựa trên student_code để tránh lỗi NOT NULL
                            String tempEmail = studentCode + "@temp.fpt.edu.vn";
                            
                            // Kiểm tra email tạm thời có bị trùng không
                            Optional<User> existingUserByTempEmail = userRepository.findByEmailIgnoreCase(tempEmail);
                            if (existingUserByTempEmail.isPresent()) {
                                throw new IllegalArgumentException(
                                    String.format("Không thể tạo user cho mã sinh viên '%s' (dòng %d). Email tạm thời đã tồn tại. Vui lòng cung cấp email trong file Excel.", 
                                        studentCode, r + 1));
                            }
                            
                            user = User.builder()
                                    .studentCode(studentCode)
                                    .fullName(fullName)
                                    .email(tempEmail) // Email tạm thời, có thể update sau
                                    .phoneNumber(phone)
                                    .isActive(true)
                                    .build();
                            usersToCreate.add(user);
                            if (studentCode != null && !studentCode.isEmpty()) {
                                studentCodesInBatch.add(studentCode);
                            }
                            if (tempEmail != null && !tempEmail.isEmpty()) {
                                emailsInBatch.add(tempEmail.toLowerCase());
                            }
                            userCreated = true;
                            createdUsers++;
                        }
                    } else {
                        // Update user info
                        boolean changed = false;
                        if (fullName != null && !fullName.isEmpty() && !fullName.equals(user.getFullName())) {
                            user.setFullName(fullName);
                            changed = true;
                        }
                        if (email != null && !email.isEmpty() && !email.equals(user.getEmail())) {
                            // Email đã được validate ở trên
                            user.setEmail(email);
                            changed = true;
                        }
                        if (phone != null && !phone.isEmpty() && !phone.equals(user.getPhoneNumber())) {
                            user.setPhoneNumber(phone);
                            changed = true;
                        }
                        if (changed) {
                            usersToUpdate.add(user);
                            updatedUsers++;
                        }
                    }

                    if (!processedUserCodes.contains(studentCode)) {
                        processedUsers++;
                        processedUserCodes.add(studentCode);
                    }

                    // Find semester from cache
                    Semester semester = semesterMap.get(semesterCode);
                    if (semester == null) {
                        throw new IllegalArgumentException("Không tìm thấy học kỳ: " + semesterCode);
                    }

                    // ✅ OPTIMIZATION: Đảm bảo user đã có ID trước khi tìm membership
                    // Nếu user mới tạo, cần save ngay để có ID
                    if (user.getId() == null && usersToCreate.contains(user)) {
                        // Remove from batch và save ngay
                        usersToCreate.remove(user);
                        user = userRepository.save(user);
                        userMap.put(user.getStudentCode(), user); // Update cache
                    }
                    
                    // Find or create ClubMemberShip
                    // ✅ FIX: Xử lý trường hợp có nhiều ClubMemberShip trùng lặp
                    List<ClubMemberShip> membershipList = clubMemberShipRepository.findByClubIdAndUserIdList(clubId, user.getId());
                    ClubMemberShip membership = membershipList != null && !membershipList.isEmpty() 
                        ? membershipList.get(0) // Lấy bản ghi đầu tiên (id nhỏ nhất)
                        : null;
                    
                    // Nếu có nhiều bản ghi trùng lặp, xóa các bản ghi còn lại
                    if (membershipList != null && membershipList.size() > 1) {
                        log.warn("[Import] Found {} duplicate ClubMemberShip records for user {} in club {}. Keeping the first one (id: {}) and cleaning up duplicates...",
                                membershipList.size(), user.getId(), clubId, membership.getId());
                        for (int i = 1; i < membershipList.size(); i++) {
                            duplicateMembershipsToDelete.add(membershipList.get(i));
                        }
                    }
                    boolean membershipCreated = false;
                    if (membership == null) {
                        LocalDate joinDate = joinDateStr != null ? parseDate(joinDateStr) : LocalDate.now();
                        membership = ClubMemberShip.builder()
                                .user(user)
                                .club(club)
                                .joinDate(joinDate)
                                .status(ClubMemberShipStatus.ACTIVE)
                                .build();
                        membershipsToCreate.add(membership);
                        membershipCreated = true;
                        createdMemberships++;
                    } else {
                        // Update if needed
                        if (membership.getStatus() != ClubMemberShipStatus.ACTIVE) {
                            membership.setStatus(ClubMemberShipStatus.ACTIVE);
                            membership.setEndDate(null);
                            membershipsToUpdate.add(membership);
                            updatedMemberships++;
                        }
                    }

                    // ✅ FIX: Sử dụng helper method để đảm bảo chỉ có 1 RoleMemberShip
                    RoleMemberShip roleMemberShip = getOrCreateSingleRoleMemberShip(membership, semester);
                    
                    // Kiểm tra nếu semester không phải current và chưa có bản ghi
                    if (roleMemberShip == null) {
                        throw new IllegalArgumentException(
                            "Không thể tạo RoleMemberShip cho kỳ học không phải kỳ hiện tại: " + semesterCode + 
                            ". Chỉ có thể import thành viên cho kỳ học đang hoạt động.");
                    }
                    
                    boolean rmCreated = roleMemberShip.getId() == null; // Check if it's a new entity

                    // Set role from cache
                    if (roleCode != null && !roleCode.isEmpty()) {
                        ClubRole clubRole = roleMap.get(roleCode);
                        roleMemberShip.setClubRole(clubRole);
                    }

                    // Set team from cache
                    if (teamName != null && !teamName.isEmpty()) {
                        Team team = teamMap.get(teamName);
                        roleMemberShip.setTeam(team);
                    }

                    // Set active status
                    boolean isActive = "true".equalsIgnoreCase(isActiveStr) || "1".equals(isActiveStr);
                    roleMemberShip.setIsActive(isActive);

                    roleMembershipsToSave.add(roleMemberShip);
                    if (rmCreated) {
                        createdRoleMemberships++;
                    } else {
                        updatedRoleMemberships++;
                    }

                    processedHistories++;
                    
                    // ✅ OPTIMIZATION: Batch save và flush định kỳ
                    if (totalRows % batchSize == 0) {
                        // Save users first (they are referenced by memberships)
                        if (!usersToCreate.isEmpty()) {
                            userRepository.saveAll(usersToCreate);
                            // Update cache với các user mới tạo
                            for (User u : usersToCreate) {
                                if (u.getStudentCode() != null && !u.getStudentCode().isEmpty()) {
                                    userMap.put(u.getStudentCode(), u);
                                }
                                if (u.getEmail() != null && !u.getEmail().isEmpty()) {
                                    emailsInBatch.add(u.getEmail().toLowerCase());
                                }
                            }
                            usersToCreate.clear();
                            // Clear batch tracking sau khi save
                            studentCodesInBatch.clear();
                            emailsInBatch.clear();
                        }
                        if (!usersToUpdate.isEmpty()) {
                            userRepository.saveAll(usersToUpdate);
                            usersToUpdate.clear();
                        }
                        
                        // Delete duplicates
                        if (!duplicateMembershipsToDelete.isEmpty()) {
                            clubMemberShipRepository.deleteAll(duplicateMembershipsToDelete);
                            duplicateMembershipsToDelete.clear();
                        }
                        
                        // Save memberships
                        if (!membershipsToCreate.isEmpty()) {
                            clubMemberShipRepository.saveAll(membershipsToCreate);
                            membershipsToCreate.clear();
                        }
                        if (!membershipsToUpdate.isEmpty()) {
                            clubMemberShipRepository.saveAll(membershipsToUpdate);
                            membershipsToUpdate.clear();
                        }
                        
                        // Save role memberships
                        if (!roleMembershipsToSave.isEmpty()) {
                            roleMemberShipRepository.saveAll(roleMembershipsToSave);
                            roleMembershipsToSave.clear();
                        }
                    }

                } catch (Exception exRow) {
                    errors.add(ImportMemberError.builder()
                            .row(r + 1)
                            .studentCode(readCell(row, colIndex.get("student_code")))
                            .semesterCode(readCell(row, colIndex.get("semester_code")))
                            .message(exRow.getMessage())
                            .build());
                }
            }
            
            // ✅ OPTIMIZATION: Flush remaining batches
            if (!usersToCreate.isEmpty()) {
                userRepository.saveAll(usersToCreate);
            }
            if (!usersToUpdate.isEmpty()) {
                userRepository.saveAll(usersToUpdate);
            }
            if (!duplicateMembershipsToDelete.isEmpty()) {
                clubMemberShipRepository.deleteAll(duplicateMembershipsToDelete);
            }
            if (!membershipsToCreate.isEmpty()) {
                clubMemberShipRepository.saveAll(membershipsToCreate);
            }
            if (!membershipsToUpdate.isEmpty()) {
                clubMemberShipRepository.saveAll(membershipsToUpdate);
            }
            if (!roleMembershipsToSave.isEmpty()) {
                roleMemberShipRepository.saveAll(roleMembershipsToSave);
            }
        }

        String summary = String.format(
                "Processed %d users (%d created, %d updated), %d memberships (%d created, %d updated), %d role histories (%d created, %d updated)",
                processedUsers, createdUsers, updatedUsers,
                createdMemberships + updatedMemberships, createdMemberships, updatedMemberships,
                createdRoleMemberships + updatedRoleMemberships, createdRoleMemberships, updatedRoleMemberships
        );

        return ImportMembersResponse.builder()
                .totalRows(totalRows)
                .processedUsers(processedUsers)
                .processedHistories(processedHistories)
                .createdUsers(createdUsers)
                .updatedUsers(updatedUsers)
                .createdMemberships(createdMemberships)
                .updatedMemberships(updatedMemberships)
                .createdRoleMemberships(createdRoleMemberships)
                .updatedRoleMemberships(updatedRoleMemberships)
                .errors(errors)
                .summary(summary)
                .build();
    }

    private String readCell(Row row, Integer idx) {
        if (idx == null) return null;
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.STRING) return c.getStringCellValue().trim();
        if (c.getCellType() == CellType.NUMERIC) {
            if (DateUtil.isCellDateFormatted(c)) {
                return c.getLocalDateTimeCellValue().toLocalDate().toString();
            }
            double d = c.getNumericCellValue();
            long l = (long) d;
            if (l == d) return String.valueOf(l);
            return String.valueOf(d);
        }
        if (c.getCellType() == CellType.BOOLEAN) return String.valueOf(c.getBooleanCellValue());
        return null;
    }

    private LocalDate parseDate(String dateStr) {
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }
}
