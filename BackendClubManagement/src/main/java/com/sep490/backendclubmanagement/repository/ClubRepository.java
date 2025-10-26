package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.FeaturedClubDTO;
import com.sep490.backendclubmanagement.entity.Club;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

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
    Optional<Club> findByClubCode(String clubCode);

    // 🔹 Reset toàn bộ CLB về không nổi bật
    @Modifying
    @Transactional
    @Query("UPDATE Club c SET c.isFeatured = false")
    void resetAllFeatured();
    @Query("SELECT DISTINCT c FROM Club c " +
            "LEFT JOIN FETCH c.campus " +
            "LEFT JOIN FETCH c.clubCategory " +
            "LEFT JOIN FETCH c.clubMemberships cm " +
            "LEFT JOIN FETCH cm.user " +
            "LEFT JOIN FETCH cm.roleMemberships rm " +
            "LEFT JOIN FETCH rm.clubRole " +
            "LEFT JOIN FETCH rm.semester " +
            "LEFT JOIN FETCH c.recruitments " +
            "WHERE c.id = :id")
    Optional<Club> findByIdWithDetails(@Param("id") Long id);

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
    @Query("SELECT DISTINCT c FROM Club c " +
            "LEFT JOIN FETCH c.campus " +
            "LEFT JOIN FETCH c.clubCategory " +
            "LEFT JOIN FETCH c.clubMemberships cm " +
            "LEFT JOIN FETCH cm.user " +
            "LEFT JOIN FETCH cm.roleMemberships rm " +
            "LEFT JOIN FETCH rm.clubRole " +
            "LEFT JOIN FETCH rm.semester " +
            "LEFT JOIN FETCH c.recruitments " +
            "WHERE c.clubCode = :clubCode")
    Optional<Club> findByClubCodeWithDetails(@Param("clubCode") String clubCode);
}
