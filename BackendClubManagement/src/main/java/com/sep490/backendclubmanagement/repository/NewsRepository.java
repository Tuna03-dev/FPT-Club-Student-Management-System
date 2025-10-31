package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.request.NewsRequest;
import com.sep490.backendclubmanagement.dto.response.ActivityDTO;
import com.sep490.backendclubmanagement.dto.response.LatestNewsDTO;
import com.sep490.backendclubmanagement.entity.News;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.sep490.backendclubmanagement.entity.Club;
import org.springframework.data.jpa.repository.Modifying;
import java.util.List;
import java.util.Optional;

@Repository
public interface NewsRepository extends JpaRepository<News, Long> {

    // Lấy danh sách tin mới nhất, bỏ spotlight
    @Query("SELECT new com.sep490.backendclubmanagement.dto.response.LatestNewsDTO(" +
            "n.id, n.title, n.thumbnailUrl, SUBSTRING(n.content, 1, 150), n.createdAt) " +
            "FROM News n " +
            "WHERE n.isDraft = false AND n.isSpotlight = false " +
            "ORDER BY n.createdAt DESC")
    List<LatestNewsDTO> findLatestNews(Pageable pageable);

    // Lấy tin spotlight mới nhất
    Optional<News> findTopByIsDraftFalseOrderByCreatedAtDesc();

    Optional<News> findTopByIsSpotlightTrueOrderByCreatedAtDesc();
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE News n SET n.isSpotlight = false WHERE n.isSpotlight = true")
    int clearAllSpotlight();
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE News n SET n.isSpotlight = true WHERE n.id = :id")
    int markSpotlight(@Param("id") Long id);
    // Dành cho phần quản trị: lọc/tìm kiếm tin tức (native)
    @Query(
            value = """
            SELECT DISTINCT n.*
            FROM news n
            LEFT JOIN clubs c ON n.club_id = c.id
            LEFT JOIN news_media nm ON nm.news_id = n.id
            WHERE
                (:#{#request.keyword} IS NULL
                    OR n.title   LIKE CONCAT('%', :#{#request.keyword}, '%')
                    OR n.content LIKE CONCAT('%', :#{#request.keyword}, '%'))
            AND (:#{#request.clubId} IS NULL OR n.club_id = :#{#request.clubId})
            ORDER BY n.created_at DESC
        """,
            countQuery = """
            SELECT COUNT(DISTINCT n.id)
            FROM news n
            LEFT JOIN clubs c ON n.club_id = c.id
            LEFT JOIN news_media nm ON nm.news_id = n.id
            WHERE
                (:#{#request.keyword} IS NULL
                    OR n.title   LIKE CONCAT('%', :#{#request.keyword}, '%')
                    OR n.content LIKE CONCAT('%', :#{#request.keyword}, '%'))
            AND (:#{#request.clubId} IS NULL OR n.club_id = :#{#request.clubId})
        """,
            nativeQuery = true
    )
    Page<News> getAllNewsByFilter(@Param("request") NewsRequest request, Pageable pageable);

    // Activity theo tác giả (JPQL) — phục vụ ClubManagementService
    @Query("SELECT new com.sep490.backendclubmanagement.dto.response.ActivityDTO(" +
            "n.id, 'NEWS', n.title, u.fullName, n.createdAt) " +
            "FROM News n JOIN n.createdBy u " +
            "WHERE u.id IN :authorIds " +
            "ORDER BY n.createdAt DESC")
    List<ActivityDTO> findActivitiesByAuthorIds(@Param("authorIds") List<Long> authorIds);
    List<News> findByIsDraftFalseOrderByCreatedAtDesc();
    List<News> findByClubAndIsDraftFalseOrderByCreatedAtDesc(Club club);
    Page<News> findByIsDraftTrueAndCreatedBy_Id(Long userId, Pageable pageable);
    @Query("""
      SELECT n FROM News n
      WHERE n.createdBy.id = :authorId
        AND n.isDraft = true
      ORDER BY n.updatedAt DESC
    """)
    Page<News> findDraftsByAuthor(@Param("authorId") Long authorId, Pageable pageable);

}
