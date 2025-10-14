package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.LatestNewsDTO;
import com.sep490.backendclubmanagement.entity.News;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional; // Import thư viện này

@Repository
public interface NewsRepository extends JpaRepository<News, Long> {

    // Sửa lại query này để không lấy tin spotlight vào danh sách tin thường
    @Query("SELECT new com.sep490.backendclubmanagement.dto.response.LatestNewsDTO(n.id, n.title, n.thumbnailUrl, SUBSTRING(n.content, 1, 150), n.createdAt) " +
            "FROM News n WHERE n.isDraft = false AND n.isSpotlight = false " +
            "ORDER BY n.createdAt DESC")
    List<LatestNewsDTO> findLatestNews(Pageable pageable);

    // Thêm phương thức mới để tìm tin spotlight mới nhất
    Optional<News> findTopByIsSpotlightTrueOrderByCreatedAtDesc();
}