package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.request.NewsRequest;
import com.sep490.backendclubmanagement.dto.response.LatestNewsDTO;
import com.sep490.backendclubmanagement.entity.News;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface NewsRepository extends JpaRepository<News, Long> {

    // Sửa lại query này để không lấy tin spotlight vào danh sách tin thường
    @Query("SELECT new com.sep490.backendclubmanagement.dto.response.LatestNewsDTO(n.id, n.title, n.thumbnailUrl, SUBSTRING(n.content, 1, 150), n.createdAt) " +
            "FROM News n WHERE n.isDraft = false AND n.isSpotlight = false " +
            "ORDER BY n.createdAt DESC")
    List<LatestNewsDTO> findLatestNews(Pageable pageable);

    // Thêm phương thức mới để tìm tin spotlight mới nhất
    Optional<News> findTopByIsSpotlightTrueOrderByCreatedAtDesc();


    @Query(value = """
                                     SELECT DISTINCT e.*
                                         FROM news e
                                         LEFT JOIN clubs c ON e.club_id = c.id
                                         WHERE\s
                                             (:#{#request.clubId} IS NULL OR e.club_id = :#{#request.clubId})
                                            AND e.is_draft = false
          """, nativeQuery = true,countProjection = "e.id")
    Page<News> getAllNewsByFilter(NewsRequest request, Pageable pageable);
}
