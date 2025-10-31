package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.response.NewsRequestResponse;
import com.sep490.backendclubmanagement.entity.RequestNews;
import com.sep490.backendclubmanagement.entity.RequestStatus;
import com.sep490.backendclubmanagement.mapper.RequestNewsMapper;
import com.sep490.backendclubmanagement.repository.RequestNewsRepository;
import com.sep490.backendclubmanagement.security.RoleGuard;
import com.sep490.backendclubmanagement.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/news/requests")
@RequiredArgsConstructor
public class NewsRequestQueryController {

    private final RequestNewsRepository requestRepo;
    private final UserService userService;
    private final RoleGuard guard;
    private final RequestNewsMapper mapper; // dùng MapStruct mapper

    // ===== DETAIL =====
    @GetMapping("/{id}")
    public ApiResponse<NewsRequestResponse> getDetail(
            @AuthenticationPrincipal User principal,
            @PathVariable Long id
    ) {
        Long me = userService.getIdByEmail(principal.getUsername());
        RequestNews r = requestRepo.findDetailById(id).orElseThrow();

        Long clubId = r.getClub() == null ? null : r.getClub().getId();
        boolean allowed = guard.isStaff(me)
                || (clubId != null && guard.canApproveAtClub(me, clubId))
                || (r.getCreatedBy() != null && r.getCreatedBy().getId().equals(me));

        if (!allowed) throw new SecurityException("Bạn không có quyền xem request này.");

        return ApiResponse.success(mapper.toDto(r)); // mapper tự fill thumbnailUrl/newsType
    }

    // ===== LIST + FILTER =====
    @GetMapping
    public ApiResponse<Object> search(
            @AuthenticationPrincipal User principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false) Long createdByUserId
    ) {
        Long me = userService.getIdByEmail(principal.getUsername());
        boolean isStaff = guard.isStaff(me);

        var managedClubIds = (clubId != null && guard.isClubManager(me, clubId))
                ? java.util.List.of(clubId) : java.util.List.<Long>of();
        var leadTeamIds = (clubId != null)
                ? guard.findLeadTeamIdsInClub(me, clubId)
                : java.util.List.<Long>of();

        int p = Math.max(1, page);
        int s = Math.max(1, size);
        var pageable = PageRequest.of(
                p - 1, s,
                Sort.by("requestDate").descending().and(Sort.by("id").descending())
        );

        var pageRs = requestRepo.findVisibleRequests(
                me,
                isStaff,
                !managedClubIds.isEmpty(), managedClubIds,
                !leadTeamIds.isEmpty(), leadTeamIds,
                pageable
        );

        var filtered = pageRs.getContent().stream().filter(r -> {
            if (status != null && !status.isBlank()) {
                try {
                    if (!RequestStatus.valueOf(status.trim()).equals(r.getStatus())) return false;
                } catch (IllegalArgumentException e) { return false; }
            }
            if (createdByUserId != null &&
                    (r.getCreatedBy() == null || !createdByUserId.equals(r.getCreatedBy().getId()))) return false;
            if (clubId != null && (r.getClub() == null || !clubId.equals(r.getClub().getId()))) return false;
            if (teamId != null && (r.getTeam() == null || !teamId.equals(r.getTeam().getId()))) return false;
            if (keyword != null && !keyword.isBlank()) {
                String kw = keyword.trim().toLowerCase();
                String t = r.getRequestTitle() == null ? "" : r.getRequestTitle().toLowerCase();
                String d = r.getDescription() == null ? "" : r.getDescription().toLowerCase();
                if (!t.contains(kw) && !d.contains(kw)) return false;
            }
            return true;
        }).toList();

        var mapped = filtered.stream().map(mapper::toDto).toList();

        var result = java.util.Map.of(
                "page", p,
                "size", s,
                "total", (int) pageRs.getTotalElements(),
                "count", mapped.size(),
                "data", mapped
        );
        return ApiResponse.success(result);
    }
}
