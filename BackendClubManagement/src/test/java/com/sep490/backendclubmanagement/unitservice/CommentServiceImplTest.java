package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.response.CommentDTO;
import com.sep490.backendclubmanagement.dto.websocket.CommentWebSocketPayload;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.repository.CommentRepository;
import com.sep490.backendclubmanagement.repository.PostRepository;
import com.sep490.backendclubmanagement.service.CommentServiceImpl;
import com.sep490.backendclubmanagement.service.NotificationService;
import com.sep490.backendclubmanagement.service.UserService;
import com.sep490.backendclubmanagement.service.WebSocketService;
import com.sep490.backendclubmanagement.mapper.CommentMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceImplTest {

    @Mock
    private CommentRepository commentRepo;

    @Mock
    private PostRepository postRepo;

    @Mock
    private UserService userService;

    @Mock
    private CommentMapper commentMapper;

    @Mock
    private WebSocketService webSocketService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private CommentServiceImpl commentService;

    // ===== helpers =====

    private User user(Long id, String name) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        return u;
    }

    private Club club(Long id) {
        Club c = new Club();
        c.setId(id);
        return c;
    }

    private Post post(Long id, Club club, User author) {
        Post p = new Post();
        p.setId(id);
        p.setClub(club);
        p.setCreatedBy(author);
        return p;
    }

    private Comment comment(Long id, Post post, User user) {
        Comment c = new Comment();
        c.setId(id);
        c.setPost(post);
        c.setUser(user);
        return c;
    }

    // ========== create() ==========

    @Test
    void create_blankContent_shouldThrowBadRequest() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.create(1L, 1L, "   ", null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void create_postNotFound_shouldThrowNotFound() {
        when(postRepo.findById(1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.create(1L, 1L, "hi", null));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void create_userNotFound_shouldThrowNotFound() {
        Post p = post(1L, club(10L), user(2L, "Author"));
        when(postRepo.findById(1L)).thenReturn(Optional.of(p));
        when(userService.getUserById(1L)).thenReturn(null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.create(1L, 1L, "hi", null));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void create_parentNotFound_shouldThrowBadRequest() {
        Post p = post(1L, club(10L), user(2L, "Author"));
        when(postRepo.findById(1L)).thenReturn(Optional.of(p));
        when(userService.getUserById(1L)).thenReturn(user(1L, "User"));
        when(commentRepo.findActiveById(100L)).thenReturn(null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.create(1L, 1L, "reply", 100L));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void create_parentDifferentPost_shouldThrowBadRequest() {
        Post p1 = post(1L, club(10L), user(2L, "Author"));
        Post p2 = post(2L, club(10L), user(3L, "Other"));
        when(postRepo.findById(1L)).thenReturn(Optional.of(p1));
        when(userService.getUserById(1L)).thenReturn(user(1L, "User"));

        Comment parent = comment(200L, p2, user(4L, "Parent"));
        when(commentRepo.findActiveById(200L)).thenReturn(parent);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.create(1L, 1L, "reply", 200L));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void create_topLevel_success_shouldSaveAndNotifyPostAuthor() throws AppException {
        Long postId = 1L;
        Long commenterId = 1L;

        User author = user(2L, "Author");
        User commenter = user(commenterId, "Commenter");
        Club club = club(10L);
        Post p = post(postId, club, author);

        when(postRepo.findById(postId)).thenReturn(Optional.of(p));
        when(userService.getUserById(commenterId)).thenReturn(commenter);

        // save trả lại chính entity
        when(commentRepo.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });

        CommentDTO dto = new CommentDTO();
        when(commentMapper.toDTO(any(Comment.class))).thenReturn(dto);

        CommentDTO result =
                commentService.create(postId, commenterId, "  hello  ", null);

        assertSame(dto, result);

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepo).save(captor.capture());
        Comment saved = captor.getValue();
        assertEquals("hello", saved.getContent());
        assertNull(saved.getParentComment());
        assertNull(saved.getRootParentCommentId());

        // gửi notify cho tác giả bài post
        verify(notificationService).sendToUser(
                eq(author.getId()),
                eq(commenterId),
                contains("đã bình luận"),
                contains("hello"),
                eq(NotificationType.POST_COMMENTED),
                eq(NotificationPriority.NORMAL),
                anyString(),
                eq(club.getId()),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );

        // broadcast websocket
        verify(webSocketService).broadcastToClub(
                eq(club.getId()),
                eq("POST"),
                eq("COMMENT_NEW"),
                any(CommentWebSocketPayload.class)
        );
    }

    @Test
    void create_reply_success_shouldSetParentRootAndSendNotifications() throws AppException {
        Long postId = 1L;
        Long commenterId = 1L;

        User postAuthor = user(3L, "PostAuthor");
        User parentAuthor = user(2L, "ParentAuthor");
        User commenter = user(commenterId, "Commenter");
        Club club = club(10L);
        Post p = post(postId, club, postAuthor);

        when(postRepo.findById(postId)).thenReturn(Optional.of(p));
        when(userService.getUserById(commenterId)).thenReturn(commenter);

        Comment parent = comment(5L, p, parentAuthor);
        when(commentRepo.findActiveById(5L)).thenReturn(parent);

        when(commentRepo.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(commentMapper.toDTO(any(Comment.class))).thenReturn(new CommentDTO());

        commentService.create(postId, commenterId, "  reply text  ", 5L);

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepo).save(captor.capture());
        Comment saved = captor.getValue();
        assertEquals(parent, saved.getParentComment());
        assertEquals(parent.getId(), saved.getRootParentCommentId());

        // notify người được reply
        verify(notificationService).sendToUser(
                eq(parentAuthor.getId()),
                eq(commenterId),
                contains("trả lời bình luận"),
                contains("reply text"),
                eq(NotificationType.POST_REPLIED),
                eq(NotificationPriority.NORMAL),
                anyString(),
                eq(club.getId()),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );

        // notify tác giả bài post (khác người được reply và khác commenter)
        verify(notificationService).sendToUser(
                eq(postAuthor.getId()),
                eq(commenterId),
                contains("bình luận trong bài viết của bạn"),
                contains("reply text"),
                eq(NotificationType.POST_COMMENTED),
                eq(NotificationPriority.NORMAL),
                anyString(),
                eq(club.getId()),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
    }

    // ========== listTopLevel & listReplies ==========

    @Test
    void listTopLevel_shouldDelegateToRepoAndMapper() {
        List<Comment> comments = Arrays.asList(new Comment(), new Comment());
        List<CommentDTO> dtos = Arrays.asList(new CommentDTO(), new CommentDTO());

        when(commentRepo.findTopLevelByPost(eq(1L), any(PageRequest.class)))
                .thenReturn(comments);
        when(commentMapper.toDTOs(comments)).thenReturn(dtos);

        List<CommentDTO> result = commentService.listTopLevel(1L, 0, 10);

        assertEquals(2, result.size());
        assertSame(dtos, result);
    }

    @Test
    void listReplies_shouldDelegateToRepoAndMapper() {
        List<Comment> comments = Collections.singletonList(new Comment());
        List<CommentDTO> dtos = Collections.singletonList(new CommentDTO());

        when(commentRepo.findReplies(5L)).thenReturn(comments);
        when(commentMapper.toDTOs(comments)).thenReturn(dtos);

        List<CommentDTO> result = commentService.listReplies(5L);

        assertEquals(1, result.size());
        assertSame(dtos, result);
    }

    // ========== edit() ==========

    @Test
    void edit_blankContent_shouldThrowBadRequest() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.edit(1L, 1L, "   "));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void edit_notFound_shouldThrowNotFound() {
        when(commentRepo.findActiveById(1L)).thenReturn(null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.edit(1L, 1L, "new"));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void edit_wrongOwner_shouldThrowForbidden() {
        Post p = post(1L, club(10L), user(2L, "Author"));
        Comment c = comment(5L, p, user(1L, "Owner"));

        when(commentRepo.findActiveById(5L)).thenReturn(c);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.edit(5L, 99L, "new"));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void edit_success_shouldUpdateContentAndBroadcast() {
        Club club = club(10L);
        Post p = post(1L, club, user(2L, "Author"));
        Comment c = comment(5L, p, user(1L, "Owner"));
        c.setContent("old");
        c.setIsEdited(false);

        when(commentRepo.findActiveById(5L)).thenReturn(c);
        when(commentRepo.save(c)).thenReturn(c);
        CommentDTO dto = new CommentDTO();
        when(commentMapper.toDTO(c)).thenReturn(dto);

        CommentDTO result = commentService.edit(5L, 1L, "  new content  ");

        assertSame(dto, result);
        assertEquals("new content", c.getContent());
        assertTrue(c.getIsEdited());

        verify(webSocketService).broadcastToClub(
                eq(club.getId()),
                eq("POST"),
                eq("COMMENT_EDIT"),
                any(CommentWebSocketPayload.class)
        );
    }

    // ========== softDelete() ==========

    @Test
    void softDelete_notFound_shouldThrowNotFound() {
        when(commentRepo.findActiveById(1L)).thenReturn(null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.softDelete(1L, 1L));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void softDelete_forbidden_whenNotOwnerOrPostAuthor() {
        Post p = post(1L, club(10L), user(2L, "Author"));
        Comment c = comment(5L, p, user(1L, "Owner"));

        when(commentRepo.findActiveById(5L)).thenReturn(c);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.softDelete(5L, 99L));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void softDelete_success_shouldBulkDeleteDescendantsAndBroadcast() {
        User owner = user(1L, "Owner");
        User author = owner; // cho đơn giản: chủ comment = chủ bài post
        Club club = club(10L);
        Post p = post(1L, club, author);
        Comment c = comment(5L, p, owner);

        when(commentRepo.findActiveById(5L)).thenReturn(c);

        // BFS: 5 -> [6,7], 6 -> [], 7 -> [8], 8 -> []
        when(commentRepo.findActiveChildIds(5L)).thenReturn(Arrays.asList(6L, 7L));
        when(commentRepo.findActiveChildIds(6L)).thenReturn(Collections.emptyList());
        when(commentRepo.findActiveChildIds(7L)).thenReturn(Collections.singletonList(8L));
        when(commentRepo.findActiveChildIds(8L)).thenReturn(Collections.emptyList());

        CommentDTO dto = new CommentDTO();
        when(commentMapper.toDTO(c)).thenReturn(dto);

        commentService.softDelete(5L, 1L);

        ArgumentCaptor<List<Long>> idsCaptor = ArgumentCaptor.forClass(List.class);
        verify(commentRepo).bulkSoftDeleteByIds(idsCaptor.capture(), any(LocalDateTime.class));

        List<Long> ids = idsCaptor.getValue();
        assertEquals(Arrays.asList(5L, 6L, 7L, 8L), ids);

        verify(webSocketService).broadcastToClub(
                eq(club.getId()),
                eq("POST"),
                eq("COMMENT_DELETE"),
                any(CommentWebSocketPayload.class)
        );
    }

    // ========== getAllFlat() ==========

    @Test
    void getAllFlat_shouldMapAllCommentsToDto() {
        Comment c1 = new Comment();
        Comment c2 = new Comment();
        List<Comment> comments = Arrays.asList(c1, c2);

        CommentDTO dto1 = new CommentDTO();
        CommentDTO dto2 = new CommentDTO();

        when(commentRepo.findAllActiveByPost(1L)).thenReturn(comments);
        when(commentMapper.toDTO(c1)).thenReturn(dto1);
        when(commentMapper.toDTO(c2)).thenReturn(dto2);

        List<CommentDTO> result = commentService.getAllFlat(1L);

        assertEquals(2, result.size());
        assertSame(dto1, result.get(0));
        assertSame(dto2, result.get(1));
    }
}
