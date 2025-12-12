package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.response.LikeDTO;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.mapper.LikeMapper;
import com.sep490.backendclubmanagement.repository.LikeRepository;
import com.sep490.backendclubmanagement.repository.PostRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import com.sep490.backendclubmanagement.service.LikeServiceImpl;
import com.sep490.backendclubmanagement.service.NotificationService;
import com.sep490.backendclubmanagement.service.WebSocketService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LikeServiceImplTest {

    @Mock
    private LikeRepository likeRepo;

    @Mock
    private EntityManager em;

    @Mock
    private LikeMapper likeMapper;

    @Mock
    private WebSocketService webSocketService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private LikeServiceImpl likeService;

    // ===== helpers =====
    private Club club(Long id) {
        Club c = new Club();
        c.setId(id);
        return c;
    }

    private User user(Long id, String name) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        return u;
    }

    private Post post(Long id, Club club, User author, String title) {
        Post p = new Post();
        p.setId(id);
        p.setClub(club);
        p.setCreatedBy(author);
        p.setTitle(title);
        return p;
    }

    // ========== toggleLike() ==========

    @Test
    void toggleLike_alreadyLiked_shouldUnlikeAndNotNotify() throws AppException {
        Long postId = 1L;
        Long userId = 10L;

        when(likeRepo.existsByPost_IdAndUser_Id(postId, userId)).thenReturn(true);
        // để đảm bảo không đi vào websocket/notification, cho post null
        when(postRepository.findById(postId)).thenReturn(Optional.empty());

        boolean liked = likeService.toggleLike(postId, userId);

        assertFalse(liked);
        verify(likeRepo).deleteByPost_IdAndUser_Id(postId, userId);
        verify(likeRepo, never()).save(any());
        verify(webSocketService, never()).broadcastToClub(anyLong(), anyString(), anyString(), any());
        verify(notificationService, never()).sendToUser(anyLong(), anyLong(), anyString(),
                anyString(), any(), any(), anyString(), any(), any(), any(), any(), any());
    }

    @Test
    void toggleLike_newLike_withClubAndDifferentAuthor_shouldSendWebSocketAndNotification() throws AppException {
        Long postId = 1L;
        Long likerId = 10L;

        when(likeRepo.existsByPost_IdAndUser_Id(postId, likerId)).thenReturn(false);

        Post postRef = new Post();
        postRef.setId(postId);
        User userRef = new User();
        userRef.setId(likerId);

        when(em.getReference(Post.class, postId)).thenReturn(postRef);
        when(em.getReference(User.class, likerId)).thenReturn(userRef);

        when(likeRepo.save(any(Like.class))).thenAnswer(inv -> inv.getArgument(0));

        Club club = club(100L);
        User author = user(20L, "Author");
        Post post = post(postId, club, author, "Post title");
        // gọi 2 lần: 1 lần cho websocket, 1 lần cho notification
        when(postRepository.findById(postId)).thenReturn(Optional.of(post), Optional.of(post));

        User liker = user(likerId, "Liker");
        when(userRepository.findById(likerId)).thenReturn(Optional.of(liker));

        when(likeRepo.countByPost_Id(postId)).thenReturn(5L);

        boolean liked = likeService.toggleLike(postId, likerId);

        assertTrue(liked);

        ArgumentCaptor<Like> likeCaptor = ArgumentCaptor.forClass(Like.class);
        verify(likeRepo).save(likeCaptor.capture());
        Like saved = likeCaptor.getValue();
        assertEquals(postRef, saved.getPost());
        assertEquals(userRef, saved.getUser());

        // websocket
        verify(webSocketService).broadcastToClub(
                eq(club.getId()),
                eq("POST"),
                eq("UPDATED"),
                any()
        );

        // notification
        verify(notificationService).sendToUser(
                eq(author.getId()),
                eq(likerId),
                contains("đã thích bài viết của bạn"),
                contains("Post title"),
                eq(NotificationType.POST_LIKED),
                eq(NotificationPriority.LOW),
                anyString(),
                eq(club.getId()),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
    }

    @Test
    void toggleLike_newLike_postWithoutClub_shouldNotSendWebSocketOrNotification() throws AppException {
        Long postId = 1L;
        Long likerId = 10L;

        when(likeRepo.existsByPost_IdAndUser_Id(postId, likerId)).thenReturn(false);

        when(em.getReference(Post.class, postId)).thenReturn(new Post());
        when(em.getReference(User.class, likerId)).thenReturn(new User());
        when(likeRepo.save(any(Like.class))).thenAnswer(inv -> inv.getArgument(0));

        // post không có club
        Post post = post(postId, null, null, "Title");
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));

        boolean liked = likeService.toggleLike(postId, likerId);

        assertTrue(liked);
        // post.getClub() == null => return sớm, không websocket, không notification
        verify(webSocketService, never()).broadcastToClub(anyLong(), anyString(), anyString(), any());
        verify(notificationService, never()).sendToUser(anyLong(), anyLong(), anyString(),
                anyString(), any(), any(), anyString(), any(), any(), any(), any(), any());
    }

    @Test
    void toggleLike_newLike_saveThrowsDataIntegrityViolation_shouldStillReturnTrue() {
        Long postId = 1L;
        Long likerId = 10L;

        when(likeRepo.existsByPost_IdAndUser_Id(postId, likerId)).thenReturn(false);

        when(em.getReference(Post.class, postId)).thenReturn(new Post());
        when(em.getReference(User.class, likerId)).thenReturn(new User());
        when(likeRepo.save(any(Like.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate"));

        // cho post null để bỏ qua websocket & notification
        when(postRepository.findById(postId)).thenReturn(Optional.empty());

        boolean liked = likeService.toggleLike(postId, likerId);

        assertTrue(liked); // dù exception, vẫn coi như đã like
    }

    @Test
    void toggleLike_newLike_websocketThrowsException_shouldStillSendNotification() throws AppException {
        Long postId = 1L;
        Long likerId = 10L;

        when(likeRepo.existsByPost_IdAndUser_Id(postId, likerId)).thenReturn(false);

        when(em.getReference(Post.class, postId)).thenReturn(new Post());
        when(em.getReference(User.class, likerId)).thenReturn(new User());
        when(likeRepo.save(any(Like.class))).thenAnswer(inv -> inv.getArgument(0));

        Club club = club(100L);
        User author = user(20L, "Author");
        Post post = post(postId, club, author, "Post title");

        // lần 1 cho websocket, lần 2 cho notification
        when(postRepository.findById(postId)).thenReturn(Optional.of(post), Optional.of(post));

        User liker = user(likerId, "Liker");
        when(userRepository.findById(likerId)).thenReturn(Optional.of(liker));

        when(likeRepo.countByPost_Id(postId)).thenReturn(3L);

        // websocket ném exception
        doThrow(new RuntimeException("ws error"))
                .when(webSocketService)
                .broadcastToClub(anyLong(), anyString(), anyString(), any());

        boolean liked = likeService.toggleLike(postId, likerId);

        assertTrue(liked);
        // dù websocket lỗi vẫn gửi notification
        verify(notificationService).sendToUser(
                eq(author.getId()),
                eq(likerId),
                anyString(),
                anyString(),
                eq(NotificationType.POST_LIKED),
                eq(NotificationPriority.LOW),
                anyString(),
                eq(club.getId()),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
    }

    @Test
    void toggleLike_newLike_notificationPostNotFound_shouldNotSendNotification() throws AppException {
        Long postId = 1L;
        Long likerId = 10L;

        when(likeRepo.existsByPost_IdAndUser_Id(postId, likerId)).thenReturn(false);

        when(em.getReference(Post.class, postId)).thenReturn(new Post());
        when(em.getReference(User.class, likerId)).thenReturn(new User());
        when(likeRepo.save(any(Like.class))).thenAnswer(inv -> inv.getArgument(0));

        // websocket: có post & club
        Club club = club(100L);
        Post post = post(postId, club, user(20L, "Author"), "Title");
        when(postRepository.findById(postId))
                .thenReturn(Optional.of(post))  // cho websocket
                .thenReturn(Optional.empty()); // cho notification

        when(userRepository.findById(likerId)).thenReturn(Optional.of(user(likerId, "Liker")));
        when(likeRepo.countByPost_Id(postId)).thenReturn(1L);

        boolean liked = likeService.toggleLike(postId, likerId);

        assertTrue(liked);
        verify(webSocketService).broadcastToClub(anyLong(), anyString(), anyString(), any());
        // post null trong block notification -> không gửi
        verify(notificationService, never()).sendToUser(anyLong(), anyLong(), anyString(),
                anyString(), any(), any(), anyString(), any(), any(), any(), any(), any());
    }

    @Test
    void toggleLike_newLike_sameAuthorAndLiker_shouldNotSendNotification() throws AppException {
        Long postId = 1L;
        Long likerId = 10L;

        when(likeRepo.existsByPost_IdAndUser_Id(postId, likerId)).thenReturn(false);

        when(em.getReference(Post.class, postId)).thenReturn(new Post());
        when(em.getReference(User.class, likerId)).thenReturn(new User());
        when(likeRepo.save(any(Like.class))).thenAnswer(inv -> inv.getArgument(0));

        Club club = club(100L);
        User author = user(likerId, "SameUser");
        Post post = post(postId, club, author, "Title");
        when(postRepository.findById(postId)).thenReturn(Optional.of(post), Optional.of(post));

        when(userRepository.findById(likerId)).thenReturn(Optional.of(author));
        when(likeRepo.countByPost_Id(postId)).thenReturn(2L);

        boolean liked = likeService.toggleLike(postId, likerId);

        assertTrue(liked);
        verify(webSocketService).broadcastToClub(anyLong(), anyString(), anyString(), any());
        // author == liker => không gửi notification
        verify(notificationService, never()).sendToUser(anyLong(), anyLong(), anyString(),
                anyString(), any(), any(), anyString(), any(), any(), any(), any(), any());
    }

    @Test
    void toggleLike_newLike_likerNull_shouldNotSendNotification() throws AppException {
        Long postId = 1L;
        Long likerId = 10L;

        when(likeRepo.existsByPost_IdAndUser_Id(postId, likerId)).thenReturn(false);

        when(em.getReference(Post.class, postId)).thenReturn(new Post());
        when(em.getReference(User.class, likerId)).thenReturn(new User());
        when(likeRepo.save(any(Like.class))).thenAnswer(inv -> inv.getArgument(0));

        Club club = club(100L);
        User author = user(20L, "Author");
        Post post = post(postId, club, author, "Title");
        when(postRepository.findById(postId)).thenReturn(Optional.of(post), Optional.of(post));

        // liker null
        when(userRepository.findById(likerId)).thenReturn(Optional.empty());
        when(likeRepo.countByPost_Id(postId)).thenReturn(2L);

        boolean liked = likeService.toggleLike(postId, likerId);

        assertTrue(liked);
        verify(webSocketService).broadcastToClub(anyLong(), anyString(), anyString(), any());
        verify(notificationService, never()).sendToUser(anyLong(), anyLong(), anyString(),
                anyString(), any(), any(), anyString(), any(), any(), any(), any(), any());
    }

    // ========== count() ==========

    @Test
    void count_shouldDelegateToRepository() {
        when(likeRepo.countByPost_Id(1L)).thenReturn(7L);

        long result = likeService.count(1L);

        assertEquals(7L, result);
        verify(likeRepo).countByPost_Id(1L);
    }

    // ========== isLikedByUser() ==========

    @Test
    void isLikedByUser_shouldDelegateToRepository() {
        when(likeRepo.existsByPost_IdAndUser_Id(1L, 2L)).thenReturn(true);

        boolean liked = likeService.isLikedByUser(1L, 2L);

        assertTrue(liked);
        verify(likeRepo).existsByPost_IdAndUser_Id(1L, 2L);
    }

    // ========== listLikes() ==========

    @Test
    void listLikes_shouldReturnMappedPage() {
        Long postId = 1L;
        Pageable pageable = PageRequest.of(0, 10);

        Like like = new Like();
        like.setId(100L);
        Page<Like> page = new PageImpl<>(Collections.singletonList(like), pageable, 1);

        LikeDTO dto = new LikeDTO();

        when(likeRepo.findByPost_Id(postId, pageable)).thenReturn(page);
        when(likeMapper.toDTO(like)).thenReturn(dto);

        Page<LikeDTO> result = likeService.listLikes(postId, pageable);

        assertEquals(1, result.getTotalElements());
        assertSame(dto, result.getContent().get(0));

        verify(likeRepo).findByPost_Id(postId, pageable);
        verify(likeMapper).toDTO(like);
    }
}
