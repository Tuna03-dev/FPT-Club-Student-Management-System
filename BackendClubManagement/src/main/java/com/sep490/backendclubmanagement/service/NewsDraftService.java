package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateDraftRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateDraftRequest;
import com.sep490.backendclubmanagement.dto.response.NewsData;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.mapper.NewsMapper;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.NewsRepository;
import com.sep490.backendclubmanagement.repository.RequestNewsRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import com.sep490.backendclubmanagement.security.RoleGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NewsDraftService {

    private final NewsRepository newsRepo;
    private final RequestNewsRepository requestRepo;
    private final UserRepository userRepo;
    private final ClubRepository clubRepo;
    private final RoleGuard guard;
    private final NewsMapper newsMapper;

    // ========== CREATE DRAFT ==========
    // NewsDraftService.createDraft
    @Transactional
    public NewsData createDraft(Long me, CreateDraftRequest body) {
        User creator = userRepo.findById(me).orElseThrow();

        Club club = null;
        if (guard.isStaff(me)) {
            if (body.getClubId() != null) {
                club = clubRepo.findById(body.getClubId()).orElseThrow();
            }
        } else {
            if (body.getClubId() == null) {
                throw new IllegalStateException("Thiếu ngữ cảnh CLB cho người dùng không phải STAFF.");
            }
            final Long clubId = body.getClubId();

            // nếu có teamId -> buộc phải là trưởng ban team đó
            if (body.getTeamId() != null) {
                boolean leadOfTeam = guard.isTeamLead(me, clubId, body.getTeamId());
                if (!leadOfTeam) {
                    throw new SecurityException("Bạn không có quyền tạo nháp cho team này.");
                }
            } else {
                // không có teamId -> chỉ Chủ nhiệm/Phó mới được
                boolean manager = guard.isClubManager(me, clubId);
                if (!manager) {
                    throw new SecurityException("Bạn không có quyền tạo nháp cho CLB này.");
                }
            }
            club = clubRepo.findById(clubId).orElseThrow();
        }

        News draft = News.builder()
                .title(body.getTitle().trim())
                .content(body.getContent().trim())
                .thumbnailUrl(body.getThumbnailUrl())
                .newsType(body.getNewsType())
                .isDraft(true)
                .createdBy(creator)
                .club(club)
                .build();

        newsRepo.save(draft);
        return newsMapper.toDto(draft);
    }






    // ========== UPDATE DRAFT ==========
    @Transactional
    public NewsData updateDraft(Long me, Long newsId, UpdateDraftRequest body) {
        News draft = newsRepo.findById(newsId).orElseThrow();

        if (!Boolean.TRUE.equals(draft.getIsDraft())) {
            throw new IllegalStateException("Bản ghi không phải nháp.");
        }

        Long clubId = draft.getClub() != null ? draft.getClub().getId() : null;

        boolean canEdit =
                guard.isStaff(me) ||
                        draft.getCreatedBy().getId().equals(me) ||
                        (clubId != null && (guard.canApproveAtClub(me, clubId) || guard.isLead(me, clubId)));

        if (!canEdit) {
            throw new SecurityException("Bạn không có quyền sửa nháp này.");
        }

        if (body.getTitle() != null)         draft.setTitle(body.getTitle());
        if (body.getContent() != null)       draft.setContent(body.getContent());
        if (body.getThumbnailUrl() != null)  draft.setThumbnailUrl(body.getThumbnailUrl());
        if (body.getNewsType() != null)      draft.setNewsType(body.getNewsType());
        if (body.getIsSpotlight() != null)   draft.setIsSpotlight(body.getIsSpotlight());

        newsRepo.save(draft);
        return newsMapper.toDto(draft);
    }

    // ========== DELETE DRAFT ==========
    @Transactional
    public void deleteDraft(Long me, Long newsId) {
        News draft = newsRepo.findById(newsId).orElseThrow();

        if (!Boolean.TRUE.equals(draft.getIsDraft())) {
            throw new IllegalStateException("Bản ghi không phải nháp.");
        }

        Long clubId = draft.getClub() != null ? draft.getClub().getId() : null;

        boolean canDelete =
                guard.isStaff(me) ||
                        draft.getCreatedBy().getId().equals(me) ||
                        (clubId != null && (guard.canApproveAtClub(me, clubId) || guard.isLead(me, clubId)));

        if (!canDelete) {
            throw new SecurityException("Bạn không có quyền xóa nháp này.");
        }

        // Nếu nháp đang nằm trong 1 request pending thì chặn
        if (requestRepo.existsPendingByNewsId(newsId)) {
            throw new IllegalStateException("Nháp đang gắn vào một yêu cầu chưa xử lý. Hãy hủy hoặc hoàn tất yêu cầu trước khi xóa.");
        }

        newsRepo.delete(draft);
    }

    // ========== LIST DRAFTS ==========
    // NewsDraftService.listDrafts
    @Transactional(readOnly = true)
    public Page<NewsData> listDrafts(Long me, Long clubId, int page, int size) {
        List<News> myDrafts = newsRepo.findAll().stream()
                .filter(n -> Boolean.TRUE.equals(n.getIsDraft()))
                .filter(n -> n.getCreatedBy() != null && n.getCreatedBy().getId().equals(me)) // << CHỐT QUYỀN
                .filter(n -> clubId == null || (n.getClub() != null && clubId.equals(n.getClub().getId())))
                .sorted(Comparator.comparing(News::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(News::getId).reversed())
                .toList();

        int p = Math.max(0, page);
        int s = Math.max(1, size);
        int from = Math.min(p * s, myDrafts.size());
        int to = Math.min(from + s, myDrafts.size());
        List<NewsData> content = myDrafts.subList(from, to).stream().map(newsMapper::toDto).toList();

        return new PageImpl<>(content, PageRequest.of(p, s), myDrafts.size());
    }


    // ========== SUBMIT DRAFT -> REQUEST ==========
    @Transactional
    public Map<String, Object> submitDraftToRequest(Long me, Long newsId) {
        News draft = newsRepo.findById(newsId).orElseThrow();
        if (!Boolean.TRUE.equals(draft.getIsDraft())) {
            throw new IllegalStateException("Bản ghi không phải nháp.");
        }

        Long clubId = draft.getClub() != null ? draft.getClub().getId() : null;

        boolean canSubmit =
                draft.getCreatedBy().getId().equals(me) ||
                        guard.isStaff(me) ||
                        (clubId != null && (guard.canApproveAtClub(me, clubId) || guard.isLead(me, clubId)));

        if (!canSubmit) throw new SecurityException("Bạn không có quyền submit nháp này.");

        if (requestRepo.existsPendingByNewsId(newsId)) {
            throw new IllegalStateException("Nháp này đã có yêu cầu đang chờ xử lý.");
        }

        User actor = userRepo.findById(me).orElseThrow();

        RequestStatus startStatus;
        Team team = null;

        if (guard.isStaff(me)) {
            startStatus = RequestStatus.PENDING_UNIVERSITY;
        } else if (clubId != null && guard.isClubManager(me, clubId)) {
            startStatus = RequestStatus.PENDING_UNIVERSITY;
        } else if (clubId != null && guard.isLead(me, clubId)) {
            startStatus = RequestStatus.PENDING_CLUB;
            team = guard.findLeadTeamInClub(me, clubId).orElse(null);
        } else {
            throw new SecurityException("Bạn không có quyền submit nháp này.");
        }

        // ✅ Copy dữ liệu từ nháp vào RequestNews
        RequestNews req = RequestNews.builder()
                .requestTitle(draft.getTitle())
                .description(draft.getContent())
                .responseMessage("")
                .status(startStatus)
                .createdBy(actor)
                .club(draft.getClub())
                .team(team)
                .thumbnailUrl(draft.getThumbnailUrl()) // Ảnh đi theo
                .newsType(draft.getNewsType())
                .news(null) // theo phương án B: xóa nháp, không gắn news
                .build();

        requestRepo.save(req);

        // ✅ XÓA nháp khỏi bảng news
        newsRepo.delete(draft);

        return Map.of(
                "requestId", req.getId(),
                "status", req.getStatus().name()
        );
    }





    // ========== STAFF PUBLISH DRAFT ==========
    @Transactional
    public NewsData publishDraftByStaff(Long me, Long newsId) {
        if (!guard.isStaff(me)) {
            throw new SecurityException("Chỉ Staff được publish trực tiếp.");
        }

        News draft = newsRepo.findById(newsId).orElseThrow();
        if (!Boolean.TRUE.equals(draft.getIsDraft())) {
            throw new IllegalStateException("Bản ghi không phải nháp.");
        }

        draft.setIsDraft(false);
        newsRepo.save(draft);

        return newsMapper.toDto(draft);
    }
    @Transactional(readOnly = true)
    public NewsData getDraftDetail(Long me, Long newsId) {
        News draft = newsRepo.findById(newsId).orElseThrow();

        if (!Boolean.TRUE.equals(draft.getIsDraft())) {
            throw new IllegalStateException("Bản ghi không phải nháp.");
        }

        Long clubId = draft.getClub() != null ? draft.getClub().getId() : null;

        boolean canView =
                guard.isStaff(me) ||
                        draft.getCreatedBy().getId().equals(me) ||
                        (clubId != null && (guard.canApproveAtClub(me, clubId) || guard.isLead(me, clubId)));

        if (!canView) throw new SecurityException("Bạn không có quyền xem nháp này.");

        return newsMapper.toDto(draft);
    }


}
