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

}
