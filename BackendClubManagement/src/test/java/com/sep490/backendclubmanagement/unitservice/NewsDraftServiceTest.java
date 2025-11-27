package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.request.ApproveNewsRequest;
import com.sep490.backendclubmanagement.dto.request.CreateDraftRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateDraftRequest;
import com.sep490.backendclubmanagement.dto.response.NewsData;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.mapper.NewsMapper;
import com.sep490.backendclubmanagement.repository.*;
import com.sep490.backendclubmanagement.security.RoleGuard;
import com.sep490.backendclubmanagement.service.NewsDraftService;
import com.sep490.backendclubmanagement.service.NotificationService;
import com.sep490.backendclubmanagement.service.WebSocketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * LƯU Ý: CreateDraftRequest/UpdateDraftRequest trong project bạn có thể
 * đặt tên khác (ở code bạn gửi là CreateDraftRequest, UpdateDraftRequest).
 * Nếu package khác thì sửa import cho khớp.
 */
@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class NewsDraftServiceTest {

    @Mock
    private NewsRepository newsRepo;
    @Mock
    private RequestNewsRepository requestRepo;
    @Mock
    private UserRepository userRepo;
    @Mock
    private ClubRepository clubRepo;
    @Mock
    private RoleGuard guard;
    @Mock
    private NewsMapper newsMapper;
    @Mock
    private WebSocketService webSocketService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NewsDraftService newsDraftService;

    private User staffUser;
    private User clubManager;
    private Club club;

    @BeforeEach
    void setup() {
        staffUser = new User();
        staffUser.setId(1L);
        staffUser.setFullName("Staff");

        clubManager = new User();
        clubManager.setId(2L);
        clubManager.setFullName("Manager");

        club = new Club();
        club.setId(10L);
        club.setClubName("CLB Dev");
    }

    // ========== createDraft ==========

    @Test
    void createDraft_staffWithoutClub_success() {
        // Arrange
        Long me = staffUser.getId();

        CreateDraftRequest body = new CreateDraftRequest();
        body.setTitle("Tiêu đề nháp");
        body.setContent("Nội dung nháp");
        body.setThumbnailUrl("thumb.png");
        body.setNewsType("GENERAL");
        body.setClubId(null);   // staff, không cần club
        body.setTeamId(null);

        when(userRepo.findById(me)).thenReturn(Optional.of(staffUser));
        when(guard.isStaff(me)).thenReturn(true);

        when(newsRepo.save(any(News.class))).thenAnswer(inv -> {
            News n = inv.getArgument(0);
            n.setId(100L);
            return n;
        });

        NewsData dto = new NewsData();
        dto.setId(100L);
        when(newsMapper.toDto(any(News.class))).thenReturn(dto);

        // Act
        NewsData result = newsDraftService.createDraft(me, body);

        // Assert
        assertNotNull(result);
        assertEquals(100L, result.getId());

        // draft phải true
        ArgumentCaptor<News> captor = ArgumentCaptor.forClass(News.class);
        verify(newsRepo).save(captor.capture());
        assertTrue(Boolean.TRUE.equals(captor.getValue().getIsDraft()));
    }

    @Test
    void createDraft_nonStaffWithoutClub_throwsIllegalState() {
        // Arrange
        Long me = clubManager.getId();

        CreateDraftRequest body = new CreateDraftRequest();
        body.setTitle("Tiêu đề");
        body.setContent("Nội dung");
        body.setClubId(null); // không staff mà không clubId

        when(userRepo.findById(me)).thenReturn(Optional.of(clubManager));
        when(guard.isStaff(me)).thenReturn(false);

        // Act & Assert
        assertThrows(IllegalStateException.class,
                () -> newsDraftService.createDraft(me, body));
    }

    // ========== updateDraft ==========

    @Test
    void updateDraft_notDraft_throwsIllegalState() {
        // Arrange
        Long me = staffUser.getId();
        Long newsId = 5L;

        News n = new News();
        n.setId(newsId);
        n.setIsDraft(false); // không phải draft

        when(newsRepo.findById(newsId)).thenReturn(Optional.of(n));

        // Act & Assert
        assertThrows(IllegalStateException.class,
                () -> newsDraftService.updateDraft(me, newsId, new UpdateDraftRequest()));
    }

    // ========== deleteDraft ==========

    @Test
    void deleteDraft_hasPendingRequest_throwsIllegalState() {
        // Arrange
        Long me = staffUser.getId();
        Long newsId = 5L;

        News draft = new News();
        draft.setId(newsId);
        draft.setIsDraft(true);
        draft.setCreatedBy(staffUser);

        when(newsRepo.findById(newsId)).thenReturn(Optional.of(draft));
        when(guard.isStaff(me)).thenReturn(true);
        when(requestRepo.existsPendingByNewsId(newsId)).thenReturn(true);

        // Act & Assert
        assertThrows(IllegalStateException.class,
                () -> newsDraftService.deleteDraft(me, newsId));
    }

    // ========== submitDraftToRequest ==========

    @Test
    void submitDraftToRequest_leadPendingClub_broadcastToClub() throws AppException {
        // Arrange
        Long me = 3L;
        Long newsId = 7L;
        Long clubId = club.getId();

        User lead = new User();
        lead.setId(me);
        lead.setFullName("Lead");

        News draft = new News();
        draft.setId(newsId);
        draft.setIsDraft(true);
        draft.setTitle("Nháp");
        draft.setContent("Nội dung");
        draft.setThumbnailUrl("thumb.png");
        draft.setNewsType("GENERAL");
        draft.setCreatedBy(lead);
        draft.setClub(club);

        when(newsRepo.findById(newsId)).thenReturn(Optional.of(draft));
        when(guard.isStaff(me)).thenReturn(false);
        when(guard.isClubManager(me, clubId)).thenReturn(false);
        when(guard.isLead(me, clubId)).thenReturn(true);
        when(userRepo.findById(me)).thenReturn(Optional.of(lead));
        when(guard.findLeadTeamInClub(me, clubId)).thenReturn(Optional.of(new Team()));

        when(requestRepo.existsPendingByNewsId(newsId)).thenReturn(false);

        when(requestRepo.save(any(RequestNews.class))).thenAnswer(inv -> {
            RequestNews r = inv.getArgument(0);
            r.setId(200L);
            return r;
        });

        // Act
        Map<String, Object> payload = newsDraftService.submitDraftToRequest(me, newsId);

        // Assert
        assertNotNull(payload);
        assertEquals(200L, payload.get("requestId"));

        // phải broadcast vào CLB
        verify(webSocketService).broadcastToClub(
                eq(clubId),
                eq("NEWS_REQUEST"),
                eq("CREATED"),
                any(Map.class)
        );

        // draft đã bị xoá
        verify(newsRepo, times(1)).delete(eq(draft));
    }

    // ========== publishDraftByStaff ==========

    @Test
    void publishDraftByStaff_success() throws AppException {
        // Arrange
        Long me = staffUser.getId();
        Long newsId = 5L;

        News draft = new News();
        draft.setId(newsId);
        draft.setIsDraft(true);
        draft.setTitle("Nháp");
        draft.setContent("Nội dung");
        draft.setClub(club);
        draft.setCreatedBy(clubManager);

        when(guard.isStaff(me)).thenReturn(true);
        when(newsRepo.findById(newsId)).thenReturn(Optional.of(draft));

        when(newsRepo.save(any(News.class))).thenAnswer(inv -> inv.getArgument(0));
        when(newsMapper.toDto(any(News.class))).thenReturn(new NewsData());

        when(notificationService.getClubManagers(club.getId())).thenReturn(List.of(99L));

        // Act
        NewsData result = newsDraftService.publishDraftByStaff(me, newsId);

        // Assert
        assertNotNull(result);
        assertFalse(draft.getIsDraft()); // đã set isDraft false

        // broadcast system-wide
        verify(webSocketService).broadcastSystemWide(
                eq("NEWS"),
                eq("PUBLISHED"),
                any()
        );

        // noti cho creator
        verify(notificationService).sendToUser(
                eq(clubManager.getId()),
                eq(me),
                anyString(),
                anyString(),
                eq(NotificationType.NEWS_PUBLISHED),
                eq(NotificationPriority.HIGH),
                anyString(),
                eq(club.getId()),
                eq(newsId),
                isNull(),
                isNull(),
                isNull()
        );

        // noti cho managers
        verify(notificationService).sendToUsers(
                eq(List.of(99L)),
                eq(me),
                anyString(),
                anyString(),
                eq(NotificationType.NEWS_PUBLISHED),
                eq(NotificationPriority.NORMAL),
                anyString(),
                eq(club.getId()),
                eq(newsId),
                isNull(),
                isNull()
        );
    }
}
