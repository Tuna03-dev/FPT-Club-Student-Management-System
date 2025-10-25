package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

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

}
