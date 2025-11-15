package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.ActivityDTO;
import com.sep490.backendclubmanagement.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    // --- Club-wide posts (toàn CLB thấy) ---
    @EntityGraph(attributePaths = {
            "club", "createdBy", "team",
            "comments", "comments.user",
            "likes", "likes.user",
            "postMedia"
    })
    @Query("""
           select p from Post p
           where p.club.id = :clubId
             and p.IsClubWide = :clubWide
             and p.status = :status
           """)
    Page<Post> findClubWidePosts(
            @Param("clubId") Long clubId,
            @Param("clubWide") boolean clubWide,
            @Param("status") String status,
            Pageable pageable
    );

    // --- Team-only posts (chỉ team trong CLB thấy) ---
    @EntityGraph(attributePaths = {
            "club", "createdBy", "team",
            "comments", "comments.user",
            "likes", "likes.user",
            "postMedia"
    })
    @Query("""
           select p from Post p
           where p.club.id = :clubId
             and p.team.id = :teamId
             and p.status = :status
           """)
    Page<Post> findTeamPosts(
            @Param("clubId") Long clubId,
            @Param("teamId") Long teamId,
            @Param("status") String status,
            Pageable pageable
    );
    @Query("SELECT new com.sep490.backendclubmanagement.dto.response.ActivityDTO(p.id, 'POST', p.title, u.fullName, p.createdAt) " +
            "FROM Post p JOIN p.createdBy u " +
            "WHERE u.id IN :authorIds")
    List<ActivityDTO> findActivitiesByAuthorIds(@Param("authorIds") List<Long> authorIds);

    // --- Pending Club-wide posts (chờ duyệt toàn CLB) ---
    @EntityGraph(attributePaths = {
            "club", "createdBy", "team",
            "comments", "comments.user",
            "likes", "likes.user",
            "postMedia"
    })
    @Query("""
           select p from Post p
           where p.club.id = :clubId
             and p.IsClubWide = true
             and p.status = :status
           """)
    Page<Post> findPendingClubWidePosts(
            @Param("clubId") Long clubId,
            @Param("status") String status,
            Pageable pageable
    );

    // --- Pending Team posts (chờ duyệt theo team) ---
    @EntityGraph(attributePaths = {
            "club", "createdBy", "team",
            "comments", "comments.user",
            "likes", "likes.user",
            "postMedia"
    })
    @Query("""
           select p from Post p
           where p.club.id = :clubId
             and p.team.id = :teamId
             and p.status = :status
           """)
    Page<Post> findPendingTeamPosts(
            @Param("clubId") Long clubId,
            @Param("teamId") Long teamId,
            @Param("status") String status,
            Pageable pageable
    );

    //Search
    @EntityGraph(attributePaths = {
            "club", "createdBy", "team",
            "comments", "comments.user",
            "likes", "likes.user",
            "postMedia"
    })
    @Query("""
           select p from Post p
           where (:clubId is null or p.club.id = :clubId)
             and (:teamId is null or p.team.id = :teamId)
             and (:clubWide is null or p.IsClubWide = :clubWide)
             and p.status = :status
             and (
                   lower(p.title)   like lower(concat('%', :q, '%'))
                or lower(p.content) like lower(concat('%', :q, '%'))
             )
           """)
    Page<Post> searchPosts(
            @Param("clubId")   Long clubId,          // null => bỏ lọc
            @Param("teamId")   Long teamId,          // null => bỏ lọc
            @Param("clubWide") Boolean clubWide,     // null => bỏ lọc
            @Param("status")   String status,        // ví dụ: "PUBLISHED"
            @Param("q")        String q,             // từ khóa
            Pageable pageable
    );

    // Chủ nhiệm / phó chủ nhiệm: thấy TẤT CẢ post của CLB (mọi team + club-wide)
    @EntityGraph(attributePaths = {
            "club", "createdBy", "team",
            "comments", "comments.user",
            "likes", "likes.user",
            "postMedia"
    })
    Page<Post> findByClub_IdAndStatus(
            Long clubId,
            String status,
            Pageable pageable
    );

    // Member / trưởng ban: thấy bài club-wide + bài của các team mình
    @EntityGraph(attributePaths = {
            "club", "createdBy", "team",
            "comments", "comments.user",
            "likes", "likes.user",
            "postMedia"
    })
    @Query("""
       select p
       from Post p
       where p.club.id = :clubId
         and p.status   = :status
         and (
               p.IsClubWide = true
            or p.team.id in :teamIds
         )
       """)
    Page<Post> findFeedForMemberInClub(
            @Param("clubId") Long clubId,
            @Param("status") String status,
            @Param("teamIds") List<Long> teamIds,
            Pageable pageable
    );


}
