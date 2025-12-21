package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.FeaturedClubDTO;
import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.entity.ClubMemberShip;
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
    Optional<Club> findByClubName(String clubName);
    boolean existsByClubNameIgnoreCase(String clubName);
    boolean existsByClubCodeIgnoreCase(String clubCode);

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
    @Query("SELECT COUNT(DISTINCT cm.id) FROM ClubMemberShip cm WHERE cm.club.id = :clubId AND cm.status = 'ACTIVE'")
    Long countMembersByClubId(@Param("clubId") Long clubId);

    // 🔹 Find clubs without wallet
    @Query("SELECT c FROM Club c WHERE c.clubWallet IS NULL AND c.deletedAt IS NULL")
    List<Club> findClubsWithoutWallet();

    // 🔹 Count total events for a club (only published events)
    @Query("SELECT COUNT(e.id) FROM Event e WHERE e.club.id = :clubId AND e.isDraft = false AND (e.eventType IS NULL OR UPPER(TRIM(e.eventType.typeName)) <> 'MEETING')")
    Long countEventsByClubId(@Param("clubId") Long clubId);

    // 🔹 Count total news for a club (only published news)
    @Query("SELECT COUNT(n.id) FROM News n WHERE n.club.id = :clubId AND n.isDraft = false AND n.deletedAt IS NULL")
    Long countNewsByClubId(@Param("clubId") Long clubId);

    // 🔹 Check if club has active recruitment
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END " +
            "FROM Recruitment r " +
            "WHERE r.club.id = :clubId " +
            "AND r.status = 'OPEN' ")
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
    @Query("SELECT c FROM Club c " +
            "WHERE (:keyword IS NULL OR LOWER(c.clubName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(c.clubCode) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:campusId IS NULL OR c.campus.id = :campusId) " +
            "AND (:categoryId IS NULL OR c.clubCategory.id = :categoryId) " +
            "AND (:status IS NULL OR c.status = :status)")
    Page<Club> getAllClubsByFilter(
            @Param("keyword") String keyword,
            @Param("campusId") Long campusId,
            @Param("categoryId") Long categoryId,
            @Param("status") String status,
            Pageable pageable
    );


    // 🔹 Get all presidents for a club (current semester, CLUB_PRESIDENT role)
    @Query("""
        SELECT cm
        FROM ClubMemberShip cm
        JOIN FETCH cm.user u
        JOIN cm.roleMemberships rm
        JOIN rm.clubRole cr
        JOIN rm.semester s
        WHERE cm.club.id = :clubId
          AND cr.roleCode = 'CLUB_PRESIDENT'
          AND rm.isActive = true
          AND s.isCurrent = true
        """)
    List<ClubMemberShip> findPresidentsByClubId(@Param("clubId") Long clubId);

}
