package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.FeaturedClubDTO;
import com.sep490.backendclubmanagement.entity.Club;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ClubRepository extends JpaRepository<Club, Long> {

    // 🔹 Lấy danh sách CLB có cờ isFeatured = true (để hiển thị lên homepage)
    @Query("""
        SELECT new com.sep490.backendclubmanagement.dto.response.FeaturedClubDTO(
            c.id, c.clubName, c.logoUrl, c.description
        )
        FROM Club c
        WHERE c.isFeatured = true   
    """)
    List<FeaturedClubDTO> findFeaturedClubs();

    // 🔹 Reset toàn bộ CLB về không nổi bật
    @Modifying
    @Transactional
    @Query("UPDATE Club c SET c.isFeatured = false")
    void resetAllFeatured();

    // 🔹 Tìm ID của các CLB có nhiều event nhất
    @Query("""
        SELECT c.id
        FROM Club c
        LEFT JOIN c.events e
        GROUP BY c.id
        ORDER BY COUNT(e.id) DESC
    """)
    List<Long> findTopClubIdsByEventCount(Pageable pageable);

    // 🔹 Đánh dấu các CLB nằm trong danh sách top là nổi bật
    @Modifying
    @Transactional
    @Query("UPDATE Club c SET c.isFeatured = true WHERE c.id IN :clubIds")
    void updateFeaturedClubs(List<Long> clubIds);
}
