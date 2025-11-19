package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.request.ClubFilterRequest;
import com.sep490.backendclubmanagement.dto.response.FeaturedClubDTO;
import com.sep490.backendclubmanagement.entity.Club;
import org.springframework.data.domain.Page;
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

    // 🔹 Count total members for a club
    @Query("SELECT COUNT(DISTINCT cm.id) FROM ClubMemberShip cm WHERE cm.club.id = :clubId")
    Long countMembersByClubId(@Param("clubId") Long clubId);

    // 🔹 Count total events for a club
    @Query("SELECT COUNT(e.id) FROM Event e WHERE e.club.id = :clubId")
    Long countEventsByClubId(@Param("clubId") Long clubId);

    // 🔹 Count total news for a club
    @Query("SELECT COUNT(n.id) FROM News n WHERE n.club.id = :clubId")
    Long countNewsByClubId(@Param("clubId") Long clubId);

    // 🔹 Check if club has active recruitment
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END " +
            "FROM Recruitment r " +
            "WHERE r.club.id = :clubId " +
            "AND r.status = 'OPEN' " +
            "AND r.startDate <= CURRENT_TIMESTAMP " +
            "AND r.endDate >= CURRENT_TIMESTAMP")
    Boolean hasActiveRecruitment(@Param("clubId") Long clubId);

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

    // 🔹 Filter clubs for staff management with search and pagination
    @Query(value = """
            SELECT DISTINCT c.*
            FROM clubs c
            LEFT JOIN campuses ca ON c.campus_id = ca.id
            LEFT JOIN club_categories cc ON c.club_category_id = cc.id
            WHERE 1=1
              AND (:#{#req.keyword} IS NULL 
                   OR LOWER(c.club_name) LIKE LOWER(CONCAT('%', :#{#req.keyword}, '%'))
                   OR LOWER(c.club_code) LIKE LOWER(CONCAT('%', :#{#req.keyword}, '%')))
              AND (:#{#req.campusId} IS NULL OR c.campus_id = :#{#req.campusId})
              AND (:#{#req.categoryId} IS NULL OR c.club_category_id = :#{#req.categoryId})
              AND (:#{#req.status} IS NULL OR c.status = :#{#req.status})
            """,
            nativeQuery = true,
            countProjection = "c.id")
    Page<Club> getAllClubsByFilter(@Param("req") ClubFilterRequest req, Pageable pageable);
}
