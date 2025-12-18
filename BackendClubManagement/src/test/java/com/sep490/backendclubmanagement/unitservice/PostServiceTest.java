package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.request.CreatePostRequest;
import com.sep490.backendclubmanagement.dto.request.UpdatePostRequest;
import com.sep490.backendclubmanagement.dto.response.PostWithRelationsData;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AccessDeniedException;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.PostRepository;
import com.sep490.backendclubmanagement.service.CloudinaryService;
import com.sep490.backendclubmanagement.service.ClubRoleService;
import com.sep490.backendclubmanagement.service.NotificationService;
import com.sep490.backendclubmanagement.service.PostService;
import com.sep490.backendclubmanagement.util.PostStatus;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;   // 👈 THÊM IMPORT NÀY


import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private CloudinaryService cloudinaryService;

    @Mock
    private ClubRoleService clubRoleService;

    @Mock
    private ClubMemberShipRepository clubMemberShipRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EntityManager em;    // 👉 sẽ được inject vào field em của PostService

    @InjectMocks
    private PostService postService;

    private Pageable pageable;

    @BeforeEach
    void setup() {
        pageable = PageRequest.of(0, 10);
        ReflectionTestUtils.setField(postService, "em", em);
    }


    // ========== HELPER METHODS ==========

    private Post samplePost(Long id, String status, boolean clubWide) {
        Post p = new Post();
        p.setId(id);
        p.setTitle("Title " + id);
        p.setContent("Content " + id);
        p.setStatus(status);
        p.setIsClubWide(clubWide);
        p.setCreatedAt(LocalDateTime.now().minusMinutes(id)); // khác nhau chút để sort
        Club c = new Club();
        c.setId(1L);
        c.setClubName("Club 1");
        p.setClub(c);

        Team t = new Team();
        t.setId(2L);
        t.setTeamName("Team 2");
        p.setTeam(t);

        User u = new User();
        u.setId(10L);
        u.setFullName("Author");
        p.setCreatedBy(u);

        return p;
    }

    private Post postWithMediaAndRelations() {
        Post p = samplePost(1L, PostStatus.PUBLISHED, true);

        // media
        PostMedia m1 = new PostMedia();
        m1.setId(100L);
        m1.setTitle("M1");
        m1.setMediaUrl("http://img1");
        m1.setMediaType("IMAGE");
        m1.setDisplayOrder(0);
        m1.setCreatedAt(LocalDateTime.now());

        PostMedia m2 = new PostMedia();
        m2.setId(101L);
        m2.setTitle("M2");
        m2.setMediaUrl("http://img2");
        m2.setMediaType("IMAGE");
        m2.setDisplayOrder(1);
        m2.setCreatedAt(LocalDateTime.now());

        p.setPostMedia(new LinkedHashSet<>(List.of(m1, m2)));

        // comments
        Comment c1 = new Comment();
        c1.setId(200L);
        c1.setContent("C1");
        c1.setIsEdited(false);
        c1.setCreatedAt(LocalDateTime.now());
        User cu = new User();
        cu.setId(20L);
        cu.setFullName("Commenter");
        c1.setUser(cu);
        Set<Comment> comments = new HashSet<>();
        comments.add(c1);
        p.setComments(comments);

// likes
        Like l1 = new Like();
        l1.setId(300L);
        l1.setCreatedAt(LocalDateTime.now());
        User lu = new User();
        lu.setId(30L);
        lu.setFullName("Liker");
        l1.setUser(lu);

        Set<Like> likes = new HashSet<>();
        likes.add(l1);
        p.setLikes(likes);

        return p;
    }

    // ========== getClubWidePosts / getTeamPosts / getPending... ==========

    @Test
    void getClubWidePosts_shouldReturnMappedPage() {
        Post post = postWithMediaAndRelations();
        when(postRepository.findClubWidePosts(1L, true, "PUBLISHED", pageable))
                .thenReturn(new PageImpl<>(List.of(post), pageable, 1));

        Page<PostWithRelationsData> result = postService.getClubWidePosts(1L, pageable);

        assertEquals(1, result.getTotalElements());
        PostWithRelationsData dto = result.getContent().get(0);
        assertEquals(post.getId(), dto.getId());
        assertEquals(post.getTitle(), dto.getTitle());
        assertEquals(post.getStatus(), dto.getStatus());
        assertEquals(2, dto.getMedia().size());
        assertEquals(1, dto.getComments().size());
        assertEquals(1, dto.getLikes().size());
    }

    @Test
    void getTeamPosts_shouldReturnMappedPage() {
        Post post = samplePost(1L, PostStatus.PUBLISHED, false);
        when(postRepository.findTeamPosts(1L, 2L, "PUBLISHED", pageable))
                .thenReturn(new PageImpl<>(List.of(post), pageable, 1));

        Page<PostWithRelationsData> result = postService.getTeamPosts(1L, 2L, pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(post.getId(), result.getContent().get(0).getId());
    }

    @Test
    void getPendingClubWidePosts_shouldReturnMappedPage() {
        Post post = samplePost(1L, PostStatus.PENDING, true);
        when(postRepository.findPendingClubWidePosts(1L, PostStatus.PENDING, pageable))
                .thenReturn(new PageImpl<>(List.of(post), pageable, 1));

        Page<PostWithRelationsData> result = postService.getPendingClubWidePosts(1L, pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(PostStatus.PENDING, result.getContent().get(0).getStatus());
    }

    @Test
    void getPendingTeamPosts_shouldReturnMappedPage() {
        Post post = samplePost(1L, PostStatus.PENDING, false);
        when(postRepository.findPendingTeamPosts(1L, 2L, PostStatus.PENDING, pageable))
                .thenReturn(new PageImpl<>(List.of(post), pageable, 1));

        Page<PostWithRelationsData> result =
                postService.getPendingTeamPosts(1L, 2L, pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(PostStatus.PENDING, result.getContent().get(0).getStatus());
    }

    // ========== getClubFeed ==========

    @Test
    void getClubFeed_asClubBoss_shouldReturnAllClubPosts() {
        Post post1 = samplePost(1L, PostStatus.PUBLISHED, true);
        Post post2 = samplePost(2L, PostStatus.PUBLISHED, false);

        when(clubRoleService.isClubLeaderOrVice(10L, 1L)).thenReturn(true);
        when(postRepository.findByClub_IdAndStatus(1L, PostStatus.PUBLISHED, pageable))
                .thenReturn(new PageImpl<>(List.of(post1, post2), pageable, 2));

        Page<PostWithRelationsData> result = postService.getClubFeed(1L, 10L, pageable);

        assertEquals(2, result.getTotalElements());
        verify(postRepository).findByClub_IdAndStatus(1L, PostStatus.PUBLISHED, pageable);
        verifyNoInteractions(clubMemberShipRepository);
    }

    @Test
    void getClubFeed_memberWithoutTeams_shouldReturnClubWideOnly() {
        Post post1 = samplePost(1L, PostStatus.PUBLISHED, true);

        when(clubRoleService.isClubLeaderOrVice(20L, 1L)).thenReturn(false);
        when(clubMemberShipRepository.findTeamIdsByUserAndClubAndStatus(
                20L, 1L, ClubMemberShipStatus.ACTIVE))
                .thenReturn(Collections.emptyList());
        when(postRepository.findClubWidePosts(1L, true, PostStatus.PUBLISHED, pageable))
                .thenReturn(new PageImpl<>(List.of(post1), pageable, 1));

        Page<PostWithRelationsData> result = postService.getClubFeed(1L, 20L, pageable);

        assertEquals(1, result.getTotalElements());
        assertTrue(result.getContent().get(0).isClubWide());
    }

    @Test
    void getClubFeed_memberWithTeams_shouldReturnFeedForMember() {
        Post post1 = samplePost(1L, PostStatus.PUBLISHED, true);  // club-wide
        Post post2 = samplePost(2L, PostStatus.PUBLISHED, false); // team

        when(clubRoleService.isClubLeaderOrVice(20L, 1L)).thenReturn(false);
        when(clubMemberShipRepository.findTeamIdsByUserAndClubAndStatus(
                20L, 1L, ClubMemberShipStatus.ACTIVE))
                .thenReturn(List.of(2L));
        when(postRepository.findFeedForMemberInClub(1L, PostStatus.PUBLISHED, List.of(2L), pageable))
                .thenReturn(new PageImpl<>(List.of(post1, post2), pageable, 2));

        Page<PostWithRelationsData> result = postService.getClubFeed(1L, 20L, pageable);

        assertEquals(2, result.getTotalElements());
        verify(postRepository).findFeedForMemberInClub(1L, PostStatus.PUBLISHED, List.of(2L), pageable);
    }

    // ========== searchPostsInClub ==========

    @Test
    void searchPostsInClub_blankKeyword_shouldReturnEmptyPage() {
        Page<PostWithRelationsData> result =
                postService.searchPostsInClub(1L, 10L, "  ", pageable);

        assertEquals(0, result.getTotalElements());
    }

    @Test
    void searchPostsInClub_asClubBoss_shouldUseAdminScope() {
        Post p1 = samplePost(1L, PostStatus.PUBLISHED, true);
        Post p2 = samplePost(2L, PostStatus.PUBLISHED, false);

        when(clubRoleService.isClubLeaderOrVice(10L, 1L)).thenReturn(true);
        when(postRepository.searchAdminScope(1L, PostStatus.PUBLISHED, "abc"))
                .thenReturn(List.of(p1, p2));

        Page<PostWithRelationsData> result =
                postService.searchPostsInClub(1L, 10L, "abc", pageable);

        assertEquals(2, result.getTotalElements());
        // check sort desc theo createdAt
        assertTrue(result.getContent().get(0).getCreatedAt()
                .isAfter(result.getContent().get(1).getCreatedAt())
                || result.getContent().get(0).getCreatedAt()
                .isEqual(result.getContent().get(1).getCreatedAt()));
    }

    @Test
    void searchPostsInClub_memberWithoutTeams_shouldSearchClubWideOnly() {
        Post p1 = samplePost(1L, PostStatus.PUBLISHED, true);

        when(clubRoleService.isClubLeaderOrVice(20L, 1L)).thenReturn(false);
        when(postRepository.searchClubWideOnly(1L, PostStatus.PUBLISHED, "abc"))
                .thenReturn(List.of(p1));
        when(clubMemberShipRepository.findTeamIdsByUserAndClubAndStatus(
                20L, 1L, ClubMemberShipStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        Page<PostWithRelationsData> result =
                postService.searchPostsInClub(1L, 20L, "abc", pageable);

        assertEquals(1, result.getTotalElements());
        assertTrue(result.getContent().get(0).isClubWide());
    }

    @Test
    void searchPostsInClub_memberWithTeams_shouldMergeClubWideAndTeamPostsDistinctAndSorted() {
        Post clubWide = samplePost(1L, PostStatus.PUBLISHED, true);
        Post teamPost = samplePost(2L, PostStatus.PUBLISHED, false);

        when(clubRoleService.isClubLeaderOrVice(20L, 1L)).thenReturn(false);
        when(postRepository.searchClubWideOnly(1L, PostStatus.PUBLISHED, "abc"))
                .thenReturn(List.of(clubWide));
        when(clubMemberShipRepository.findTeamIdsByUserAndClubAndStatus(
                20L, 1L, ClubMemberShipStatus.ACTIVE))
                .thenReturn(List.of(2L));
        when(postRepository.searchTeamScope(1L, List.of(2L), PostStatus.PUBLISHED, "abc"))
                .thenReturn(List.of(teamPost));

        Page<PostWithRelationsData> result =
                postService.searchPostsInClub(1L, 20L, "abc", pageable);

        assertEquals(2, result.getTotalElements());
    }

    // ========== createPostWithUploads ==========

    @Test
    void createPostWithUploads_clubWide_clubPresident_shouldAutoPublish_noNotification() throws AppException {
        Long clubId = 1L;
        Long authorId = 10L;

        CreatePostRequest req = new CreatePostRequest();
        req.setClubId(clubId);
        req.setClubWide(true);
        req.setTitle("New post");
        req.setContent("Content");
        req.setWithinClub(true);

        when(clubRoleService.isClubLeaderOrVice(authorId, clubId)).thenReturn(true);

        Club clubRef = new Club();
        clubRef.setId(clubId);
        User authorRef = new User();
        authorRef.setId(authorId);

        when(em.getReference(Club.class, clubId)).thenReturn(clubRef);
        when(em.getReference(User.class, authorId)).thenReturn(authorRef);

        // save trả lại chính đối tượng post
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        PostWithRelationsData dto =
                postService.createPostWithUploads(req, null, authorId);

        assertEquals(PostStatus.PUBLISHED, dto.getStatus());
        assertTrue(dto.isClubWide());
        verify(notificationService, never()).sendToUsers(
                anyList(), anyLong(), anyString(), anyString(),
                any(), any(), anyString(),
                any(), any(), any(), any()
        );
    }

    @Test
    void createPostWithUploads_teamPost_teamLead_shouldAutoPublish() throws AppException{
        Long clubId = 1L;
        Long teamId = 2L;
        Long authorId = 10L;

        CreatePostRequest req = new CreatePostRequest();
        req.setClubId(clubId);
        req.setClubWide(false);
        req.setTeamId(teamId);
        req.setTitle("Team post");
        req.setContent("Content");

        when(clubRoleService.isClubLeaderOrVice(authorId, clubId)).thenReturn(false);
        when(clubRoleService.isTeamLeader(authorId, teamId)).thenReturn(true);

        Club clubRef = new Club();
        clubRef.setId(clubId);
        Team teamRef = new Team();
        teamRef.setId(teamId);
        User authorRef = new User();
        authorRef.setId(authorId);

        when(em.getReference(Club.class, clubId)).thenReturn(clubRef);
        when(em.getReference(Team.class, teamId)).thenReturn(teamRef);
        when(em.getReference(User.class, authorId)).thenReturn(authorRef);

        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        PostWithRelationsData dto =
                postService.createPostWithUploads(req, null, authorId);

        assertEquals(PostStatus.PUBLISHED, dto.getStatus());
        assertEquals(teamId, dto.getTeamId());
    }

    @Test
    void createPostWithUploads_teamPost_memberInTeam_shouldPending_andSendNotification() throws AppException{
        Long clubId = 1L;
        Long teamId = 2L;
        Long authorId = 10L;

        CreatePostRequest req = new CreatePostRequest();
        req.setClubId(clubId);
        req.setClubWide(false);
        req.setTeamId(teamId);
        req.setTitle("Team post");
        req.setContent("Content");

        when(clubRoleService.isClubLeaderOrVice(authorId, clubId)).thenReturn(false);
        when(clubRoleService.isTeamLeader(authorId, teamId)).thenReturn(false);
        when(clubRoleService.isMemberOfTeam(authorId, teamId)).thenReturn(true);

        Club clubRef = new Club();
        clubRef.setId(clubId);
        Team teamRef = new Team();
        teamRef.setId(teamId);
        User authorRef = new User();
        authorRef.setId(authorId);

        when(em.getReference(Club.class, clubId)).thenReturn(clubRef);
        when(em.getReference(Team.class, teamId)).thenReturn(teamRef);
        when(em.getReference(User.class, authorId)).thenReturn(authorRef);

        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        when(notificationService.getClubManagers(clubId))
                .thenReturn(List.of(99L));

        PostWithRelationsData dto =
                postService.createPostWithUploads(req, null, authorId);

        assertEquals(PostStatus.PENDING, dto.getStatus());
        verify(notificationService).sendToUsers(
                eq(List.of(99L)),
                eq(authorId),
                anyString(),
                anyString(),
                eq(NotificationType.POST_PENDING_APPROVAL),
                eq(NotificationPriority.NORMAL),
                anyString(),
                eq(clubId),
                isNull(),
                eq(teamId),
                isNull()
        );
    }

    @Test
    void createPostWithUploads_teamPost_userNotInTeam_shouldThrowAccessDenied() throws AppException{
        Long clubId = 1L;
        Long teamId = 2L;
        Long authorId = 10L;

        CreatePostRequest req = new CreatePostRequest();
        req.setClubId(clubId);
        req.setClubWide(false);
        req.setTeamId(teamId);
        req.setTitle("Team post");

        when(clubRoleService.isClubLeaderOrVice(authorId, clubId)).thenReturn(false);
        when(clubRoleService.isTeamLeader(authorId, teamId)).thenReturn(false);
        when(clubRoleService.isMemberOfTeam(authorId, teamId)).thenReturn(false);

        assertThrows(AccessDeniedException.class,
                () -> postService.createPostWithUploads(req, null, authorId));
    }

    @Test
    void createPostWithUploads_teamIdMissing_whenClubWideFalse_shouldThrowIllegalArgument() {
        CreatePostRequest req = new CreatePostRequest();
        req.setClubId(1L);
        req.setClubWide(false);
        req.setTitle("Team post");

        assertThrows(IllegalArgumentException.class,
                () -> postService.createPostWithUploads(req, null, 10L));
    }

    @Test
    void createPostWithUploads_metaOnly_shouldCreateMediaFromMeta() throws AppException{
        Long clubId = 1L;
        Long authorId = 10L;

        CreatePostRequest req = new CreatePostRequest();
        req.setClubId(clubId);
        req.setClubWide(true);
        req.setTitle("Post with media");

        CreatePostRequest.PostMediaItem meta = new CreatePostRequest.PostMediaItem();
        meta.setTitle("Meta image");
        meta.setMediaUrl("http://image");
        meta.setMediaType("IMAGE");
        meta.setDisplayOrder(0);
        req.setMedia(List.of(meta));

        when(clubRoleService.isClubLeaderOrVice(authorId, clubId)).thenReturn(true);

        Club clubRef = new Club(); clubRef.setId(clubId);
        User authorRef = new User(); authorRef.setId(authorId);
        when(em.getReference(Club.class, clubId)).thenReturn(clubRef);
        when(em.getReference(User.class, authorId)).thenReturn(authorRef);

        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        PostWithRelationsData dto =
                postService.createPostWithUploads(req, null, authorId);

        assertEquals(1, dto.getMedia().size());
        assertEquals("Meta image", dto.getMedia().get(0).getTitle());
        assertEquals("http://image", dto.getMedia().get(0).getMediaUrl());
    }

    // ========== updatePostWithUploads ==========

    @Test
    void updatePostWithUploads_pendingClubWide_bossShouldAutoPublish() {
        Post p = samplePost(1L, PostStatus.PENDING, true);
        Club club = new Club();
        club.setId(1L);
        p.setClub(club);

        when(postRepository.findById(1L)).thenReturn(Optional.of(p));
        when(clubRoleService.isClubLeaderOrVice(10L, 1L)).thenReturn(true);
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdatePostRequest req = new UpdatePostRequest();
        req.setTitle("Updated");

        PostWithRelationsData dto =
                postService.updatePostWithUploads(1L, req, null, 10L);

        assertEquals(PostStatus.PUBLISHED, dto.getStatus());
        assertEquals("Updated", dto.getTitle());
    }

    @Test
    void updatePostWithUploads_pendingTeamPost_teamLeadShouldAutoPublish()   {
        Post p = samplePost(1L, PostStatus.PENDING, false);
        Club club = new Club(); club.setId(1L);
        Team team = new Team(); team.setId(2L);
        p.setClub(club);
        p.setTeam(team);

        when(postRepository.findById(1L)).thenReturn(Optional.of(p));
        //when(clubRoleService.isClubLeaderOrVice(10L, 1L)).thenReturn(false);
        when(clubRoleService.isTeamLeader(10L, 2L)).thenReturn(true);
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdatePostRequest req = new UpdatePostRequest();

        PostWithRelationsData dto =
                postService.updatePostWithUploads(1L, req, null, 10L);

        assertEquals(PostStatus.PUBLISHED, dto.getStatus());
    }

    @Test
    void updatePostWithUploads_deleteMediaIds_shouldRemoveMediaFromPost() {
        Post p = samplePost(1L, PostStatus.PUBLISHED, true);

        PostMedia m1 = new PostMedia();
        m1.setId(100L);
        PostMedia m2 = new PostMedia();
        m2.setId(101L);
        p.setPostMedia(new LinkedHashSet<>(List.of(m1, m2)));

        when(postRepository.findById(1L)).thenReturn(Optional.of(p));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdatePostRequest req = new UpdatePostRequest();
        req.setDeleteMediaIds(List.of(100L));

        PostWithRelationsData dto =
                postService.updatePostWithUploads(1L, req, null, 10L);

        assertEquals(1, dto.getMedia().size());
        assertEquals(101L, dto.getMedia().get(0).getId());
        verify(em).remove(m1);
    }

    // ========== deletePost / deleteOneMedia ==========

    @Test
    void deletePost_existing_shouldCallRepositoryDelete() {
        Post p = samplePost(1L, PostStatus.PUBLISHED, true);
        when(postRepository.findById(1L)).thenReturn(Optional.of(p));

        postService.deletePost(1L);

        verify(postRepository).delete(p);
    }

    @Test
    void deletePost_notFound_shouldThrow() {
        when(postRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> postService.deletePost(1L));
    }

    @Test
    void deleteOneMedia_success_shouldRemoveAndReindex() {
        Post p = samplePost(1L, PostStatus.PUBLISHED, true);

        PostMedia m1 = new PostMedia();
        m1.setId(100L);
        m1.setDisplayOrder(0);
        PostMedia m2 = new PostMedia();
        m2.setId(101L);
        m2.setDisplayOrder(1);

        p.setPostMedia(new LinkedHashSet<>(List.of(m1, m2)));

        when(postRepository.findById(1L)).thenReturn(Optional.of(p));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        PostWithRelationsData dto =
                postService.deleteOneMedia(1L, 100L);

        assertEquals(1, dto.getMedia().size());
        assertEquals(101L, dto.getMedia().get(0).getId());
        assertEquals(0, dto.getMedia().get(0).getDisplayOrder());
        verify(em).remove(m1);
    }

    @Test
    void deleteOneMedia_mediaNotBelongToPost_shouldThrow() {
        Post p = samplePost(1L, PostStatus.PUBLISHED, true);
        PostMedia m1 = new PostMedia();
        m1.setId(100L);
        p.setPostMedia(new LinkedHashSet<>(List.of(m1)));

        when(postRepository.findById(1L)).thenReturn(Optional.of(p));

        assertThrows(IllegalArgumentException.class,
                () -> postService.deleteOneMedia(1L, 999L));
    }

    @Test
    void deleteOneMedia_postHasNoMedia_shouldThrow() {
        Post p = samplePost(1L, PostStatus.PUBLISHED, true);
        p.setPostMedia(Collections.emptySet());

        when(postRepository.findById(1L)).thenReturn(Optional.of(p));

        assertThrows(IllegalArgumentException.class,
                () -> postService.deleteOneMedia(1L, 100L));
    }

    // ========== getClubIdByPostId ==========

    @Test
    void getClubIdByPostId_success() {
        Post p = samplePost(1L, PostStatus.PUBLISHED, true);
        when(postRepository.findById(1L)).thenReturn(Optional.of(p));

        Long clubId = postService.getClubIdByPostId(1L);

        assertEquals(1L, clubId);
    }

    @Test
    void getClubIdByPostId_postNotFound_shouldThrow() {
        when(postRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> postService.getClubIdByPostId(1L));
    }

    @Test
    void getClubIdByPostId_postWithoutClub_shouldThrow() {
        Post p = samplePost(1L, PostStatus.PUBLISHED, true);
        p.setClub(null);
        when(postRepository.findById(1L)).thenReturn(Optional.of(p));

        assertThrows(IllegalStateException.class,
                () -> postService.getClubIdByPostId(1L));
    }

    // ========== canApprove ==========

    @Test
    void canApprove_clubWide_shouldCheckClubLeaderOrVice() {
        Post p = samplePost(1L, PostStatus.PENDING, true);
        Club c = new Club();
        c.setId(1L);
        p.setClub(c);

        when(clubRoleService.isClubLeaderOrVice(10L, 1L)).thenReturn(true);

        assertTrue(postService.canApprove(10L, p));
        verify(clubRoleService).isClubLeaderOrVice(10L, 1L);
    }

    @Test
    void canApprove_teamPost_teamLeadOrClubBoss() {
        Post p = samplePost(1L, PostStatus.PENDING, false);
        Club c = new Club(); c.setId(1L);
        Team t = new Team(); t.setId(2L);
        p.setClub(c);
        p.setTeam(t);

        when(clubRoleService.isTeamLeader(10L, 2L)).thenReturn(true);
        when(clubRoleService.isClubLeaderOrVice(10L, 1L)).thenReturn(false);

        assertTrue(postService.canApprove(10L, p));

        when(clubRoleService.isTeamLeader(10L, 2L)).thenReturn(false);
        when(clubRoleService.isClubLeaderOrVice(10L, 1L)).thenReturn(true);

        assertTrue(postService.canApprove(10L, p));

        when(clubRoleService.isTeamLeader(10L, 2L)).thenReturn(false);
        when(clubRoleService.isClubLeaderOrVice(10L, 1L)).thenReturn(false);

        assertFalse(postService.canApprove(10L, p));
    }
}
