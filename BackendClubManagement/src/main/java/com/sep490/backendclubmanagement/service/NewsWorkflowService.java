package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.ApproveNewsRequest;
import com.sep490.backendclubmanagement.dto.request.CreateNewsRequest;
import com.sep490.backendclubmanagement.dto.request.RejectNewsRequest;
import com.sep490.backendclubmanagement.dto.response.NewsRequestResponse;
import com.sep490.backendclubmanagement.dto.response.PublishResult;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.mapper.NewsMapper;
import com.sep490.backendclubmanagement.mapper.RequestNewsMapper;
import com.sep490.backendclubmanagement.repository.*;
import com.sep490.backendclubmanagement.security.RoleGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NewsWorkflowService {

    private final RequestNewsRepository requestRepo;
    private final NewsRepository newsRepo;
    private final UserRepository userRepo;
    private final ClubRepository clubRepo;
    private final RoleGuard guard;
    private final RequestNewsMapper mapper;
    private final NewsMapper newsMapper;
    private final TeamRepository teamRepo;
    // ========== CREATE REQUEST ==========
    @Transactional
    public NewsRequestResponse createRequest(Long me, CreateNewsRequest dto) {
        String title = dto.getTitle() == null ? "" : dto.getTitle().trim();
        String desc  = dto.getContent() == null ? "" : dto.getContent().trim();
        if (title.isEmpty()) throw new IllegalArgumentException("Tiêu đề không được để trống.");
        if (desc.isEmpty())  throw new IllegalArgumentException("Nội dung không được để trống.");
        if (dto.getClubId() == null) throw new IllegalArgumentException("Thiếu clubId.");

        User creator = userRepo.findById(me).orElseThrow();
        Club club    = clubRepo.findById(dto.getClubId()).orElseThrow();

        boolean isStaff      = guard.isStaff(me);
        boolean isManager    = guard.canApproveAtClub(me, club.getId()); // chủ nhiệm/phó
        boolean isLeadInClub = guard.isLead(me, club.getId());           // trưởng ban (bất kỳ ban) trong CLB

        RequestStatus startStatus;
        News attachedNews = null;
        Team team = null;

        if (isStaff) {
            startStatus = RequestStatus.PENDING_UNIVERSITY;

        } else if (isManager) {
            startStatus = RequestStatus.PENDING_UNIVERSITY;

            // (Tuỳ chính sách: có thể KHÔNG cần tạo News ở đây.
            //  Nếu muốn giữ nguyên hành vi cũ của bạn:)
            attachedNews = News.builder()
                    .title(title)
                    .content(desc)
                    .thumbnailUrl(dto.getThumbnailUrl())
                    .newsType(dto.getNewsType())
                    .isDraft(false)
                    .createdBy(creator)
                    .club(club)
                    .build();
            newsRepo.save(attachedNews);

        } else if (isLeadInClub) {
            if (dto.getTeamId() == null) {
                throw new IllegalArgumentException("Thiếu teamId cho trưởng ban.");
            }
            if (!guard.isTeamLead(me, club.getId(), dto.getTeamId())) {
                throw new SecurityException("Bạn không có quyền tạo request cho team này.");
            }
            team = teamRepo.findById(dto.getTeamId()).orElseThrow();
            startStatus = RequestStatus.PENDING_CLUB;

        } else {
            throw new SecurityException("Bạn không có quyền tạo request trong CLB này.");
        }

        RequestNews req = RequestNews.builder()
                .requestTitle(title)
                .description(desc)
                .responseMessage("")
                .status(startStatus)
                .createdBy(creator)
                .club(club)
                .team(team)
                .news(attachedNews)                 // có thể null
                .thumbnailUrl(dto.getThumbnailUrl())// ảnh đi theo request
                .newsType(dto.getNewsType())
                .build();

        requestRepo.save(req);

        RequestNews detail = requestRepo.findDetailById(req.getId()).orElseThrow();
        return mapper.toDto(detail);
    }



    // ========== CLUB LEVEL: APPROVE & SUBMIT TO STAFF ==========
    @Transactional
    public NewsRequestResponse clubApproveAndSubmit(Long clubLeaderId, Long requestId, ApproveNewsRequest body) {
        RequestNews r = requestRepo.findById(requestId).orElseThrow();

        if (!guard.isClubLeader(clubLeaderId, r.getClub().getId())) {
            throw new SecurityException("Chỉ chủ nhiệm CLB được duyệt.");
        }

        if (r.getStatus() != RequestStatus.PENDING_CLUB) {
            throw new IllegalStateException("Yêu cầu không ở trạng thái PENDING_CLUB.");
        }

        if (body != null) {
//            if (body.getTitle() != null) r.getRequestTitle();
            if (body.getContent() != null) r.setDescription(body.getContent());
        }

        r.setStatus(RequestStatus.PENDING_UNIVERSITY);

        r.setResponseMessage("Chủ nhiệm CLB đã duyệt và gửi lên cấp trường.");
        requestRepo.save(r);

        RequestNews detail = requestRepo.findDetailById(r.getId()).orElseThrow();
        return mapper.toDto(detail);
    }


    // ========== CLUB LEVEL: REJECT (President only) ==========
    @Transactional
    public NewsRequestResponse clubPresidentReject(Long userId, Long requestId, RejectNewsRequest body) {
        RequestNews r = requestRepo.findById(requestId).orElseThrow();
        Long clubId = r.getClub().getId();

        if (!guard.canRejectAtClub(userId, clubId)) {
            throw new SecurityException("Chỉ Chủ nhiệm được từ chối ở cấp CLB.");
        }
        if (r.getStatus() != RequestStatus.PENDING_CLUB) {
            throw new IllegalStateException("Yêu cầu không ở trạng thái PENDING_CLUB.");
        }

        r.setStatus(RequestStatus.REJECTED_CLUB);
        r.setResponseMessage(body == null ? "" : body.getReason());

        RequestNews detail = requestRepo.findDetailById(r.getId()).orElseThrow();
        return mapper.toDto(detail);
    }

    // ========== STAFF LEVEL: APPROVE & PUBLISH ==========
    @Transactional
    public NewsRequestResponse staffApproveAndPublish(Long staffId, Long requestId, ApproveNewsRequest body) {
        RequestNews r = requestRepo.findById(requestId).orElseThrow();

        if (!guard.isStaff(staffId)) {
            throw new SecurityException("Chỉ Staff được duyệt ở cấp trường.");
        }
        if (r.getStatus() != RequestStatus.PENDING_UNIVERSITY) {
            throw new IllegalStateException("Yêu cầu không ở trạng thái PENDING_UNIVERSITY.");
        }

        News usedNews;
        if (r.getNews() != null && Boolean.TRUE.equals(r.getNews().getIsDraft())) {
            // có nháp -> publish nháp
            usedNews = r.getNews();
            usedNews.setIsDraft(false);

            if (body != null) {
                if (body.getTitle() != null)        usedNews.setTitle(body.getTitle());
                if (body.getContent() != null)      usedNews.setContent(body.getContent());
                if (body.getThumbnailUrl() != null) usedNews.setThumbnailUrl(body.getThumbnailUrl());
                if (body.getNewsType() != null)     usedNews.setNewsType(body.getNewsType());
                if (body.getIsSpotlight() != null)  usedNews.setIsSpotlight(body.getIsSpotlight());
            }
            newsRepo.save(usedNews);

        } else if (r.getNews() != null) {
            // đã gắn news publish sẵn
            usedNews = r.getNews();

        } else {
            // TẠO NEWS MỚI từ request (hoặc body override)
            String title   = (body != null && body.getTitle() != null)        ? body.getTitle()        : r.getRequestTitle();
            String content = (body != null && body.getContent() != null)      ? body.getContent()      : r.getDescription();
            String thumb   = (body != null && body.getThumbnailUrl() != null) ? body.getThumbnailUrl() : r.getThumbnailUrl();
            String type    = (body != null && body.getNewsType() != null)     ? body.getNewsType()     : r.getNewsType();

            usedNews = News.builder()
                    .title(title)
                    .content(content)
                    .thumbnailUrl(thumb)
                    .newsType(type)
                    .isSpotlight(body != null && Boolean.TRUE.equals(body.getIsSpotlight()))
                    .isDraft(false)
                    .createdBy(r.getCreatedBy())
                    .club(r.getClub())
                    .build();
            newsRepo.save(usedNews);
            r.setNews(usedNews);
        }

        // Đồng bộ lại dữ liệu “bóng” trên RequestNews nếu còn thiếu
        if (r.getThumbnailUrl() == null && usedNews.getThumbnailUrl() != null) {
            r.setThumbnailUrl(usedNews.getThumbnailUrl());
        }
        if (r.getNewsType() == null && usedNews.getNewsType() != null) {
            r.setNewsType(usedNews.getNewsType());
        }

        r.setStatus(RequestStatus.APPROVED_UNIVERSITY);
        r.setResponseMessage("Staff approved and published.");
        requestRepo.saveAndFlush(r); // đảm bảo flush trước khi load detail

        RequestNews detail = requestRepo.findDetailById(r.getId()).orElseThrow();
        return mapper.toDto(detail);
    }




    // ========== STAFF LEVEL: REJECT ==========
    @Transactional
    public NewsRequestResponse staffReject(Long staffId, Long requestId, RejectNewsRequest body) {
        RequestNews r = requestRepo.findById(requestId).orElseThrow();

        if (!guard.isStaff(staffId)) {
            throw new SecurityException("Chỉ Staff được từ chối ở cấp trường.");
        }
        if (r.getStatus() != RequestStatus.PENDING_UNIVERSITY) {
            throw new IllegalStateException("Yêu cầu không ở trạng thái PENDING_UNIVERSITY.");
        }

        r.setStatus(RequestStatus.REJECTED_UNIVERSITY);
        r.setResponseMessage(body == null ? "" : body.getReason());

        RequestNews detail = requestRepo.findDetailById(r.getId()).orElseThrow();
        return mapper.toDto(detail);
    }

    // ========== STAFF DIRECT PUBLISH ==========
    // NewsWorkflowService.staffDirectPublish(...)
    @Transactional
    public PublishResult staffDirectPublish(Long me, ApproveNewsRequest body) {
        if (!guard.isStaff(me)) {
            throw new SecurityException("Chỉ Staff được publish trực tiếp.");
        }

        String title = body.getTitle() == null ? "" : body.getTitle().trim();
        String content = body.getContent() == null ? "" : body.getContent().trim();
        if (title.isEmpty()) throw new IllegalArgumentException("Tiêu đề không được để trống.");
        if (content.isEmpty()) throw new IllegalArgumentException("Nội dung không được để trống.");

        User staff = userRepo.findById(me).orElseThrow();

        News news = News.builder()
                .title(title)
                .content(content)
                .thumbnailUrl(body.getThumbnailUrl())
                .newsType(body.getNewsType())
                .isSpotlight(Boolean.TRUE.equals(body.getIsSpotlight()))
                .isDraft(false)
                .createdBy(staff)
                .club(null) // ❗ luôn null vì Staff không đại diện CLB
                .build();

        newsRepo.save(news);

        return new PublishResult(news.getId(), newsMapper.toDto(news), "Đăng trực tiếp thành công");
    }


    @Transactional
    public void cancelRequest(Long me, Long requestId) {
        RequestNews r = requestRepo.findDetailById(requestId).orElseThrow();

        boolean canCancel =
                (r.getCreatedBy() != null && r.getCreatedBy().getId().equals(me))
                        || guard.isStaff(me)
                        || (r.getClub() != null && guard.canApproveAtClub(me, r.getClub().getId()));

        if (!canCancel) throw new SecurityException("Không có quyền hủy request này.");

        if (!(r.getStatus() == RequestStatus.PENDING_CLUB || r.getStatus() == RequestStatus.PENDING_UNIVERSITY)) {
            throw new IllegalStateException("Chỉ hủy được khi request đang ở trạng thái PENDING.");
        }

        // đưa News về nháp
        News news = r.getNews();
        if (news != null) {
            news.setIsDraft(true);
            newsRepo.save(news);
        }

        // đổi trạng thái request => CANCELED
        r.setStatus(RequestStatus.CANCELED);
        requestRepo.save(r);
    }


}
