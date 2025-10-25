package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.request.NewsRequest;
import com.sep490.backendclubmanagement.entity.News;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface NewsRepository extends JpaRepository<News, Long> {
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
