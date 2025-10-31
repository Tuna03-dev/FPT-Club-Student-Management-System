package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.RequestNews;
import com.sep490.backendclubmanagement.entity.RequestStatus;
import org.springframework.data.domain.Page;                    // ✅ THÊM
import org.springframework.data.domain.Pageable;            // ✅ THÊM
import org.springframework.data.jpa.repository.EntityGraph; // ✅ THÊM
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RequestNewsRepository extends JpaRepository<RequestNews, Long> {

    @Query("""
        SELECT r
        FROM RequestNews r
        LEFT JOIN FETCH r.createdBy
        LEFT JOIN FETCH r.club
        LEFT JOIN FETCH r.team
        LEFT JOIN FETCH r.news
        WHERE r.id = :id
    """)
    Optional<RequestNews> findDetailById(@Param("id") Long id);

    @Query("""
  SELECT r FROM RequestNews r
  JOIN FETCH r.createdBy
  JOIN FETCH r.club
  LEFT JOIN FETCH r.team
  LEFT JOIN FETCH r.news
  ORDER BY r.requestDate DESC, r.id DESC
""")
    List<RequestNews> findAllWithJoins();


    @Query("""
        SELECT CASE WHEN COUNT(r)>0 THEN true ELSE false END
        FROM RequestNews r
        WHERE r.news.id = :newsId
          AND r.status IN (com.sep490.backendclubmanagement.entity.RequestStatus.PENDING_CLUB,
                           com.sep490.backendclubmanagement.entity.RequestStatus.PENDING_UNIVERSITY)
    """)
    boolean existsPendingByNewsId(@Param("newsId") Long newsId);

    // =========================
    // TRUY VẤN THEO PHÂN QUYỀN
    // =========================
    //
    // Điều kiện tổng hợp (OR):
    // 1) r.createdBy.id = :me  (ai cũng thấy request mình tạo)
    // 2) Staff thấy request đã lên cấp trường
    // 3) Club Manager thấy request thuộc CLB họ quản lý
    // 4) Team Lead thấy request thuộc team họ lead
    //
    // Ghi chú xử lý danh sách rỗng:
    // - Nếu :isClubManager = false thì nhánh 3) sẽ false, nhưng param :clubIds vẫn được bind.
    //   Hibernate 6 xử lý list rỗng an toàn; nếu DB bạn không thích, hãy truyền List.of(-1L).
    // - Tương tự với :isTeamLead và :teamIds.
    //
    @EntityGraph(attributePaths = {"createdBy","club","news","team"})
    @Query("""
        SELECT r
        FROM RequestNews r
        WHERE
            r.createdBy.id = :me
        OR (
            :isStaff = TRUE
            AND r.status IN (
                com.sep490.backendclubmanagement.entity.RequestStatus.PENDING_UNIVERSITY,
                com.sep490.backendclubmanagement.entity.RequestStatus.APPROVED_UNIVERSITY,
                com.sep490.backendclubmanagement.entity.RequestStatus.REJECTED_UNIVERSITY
            )
        )
        OR (
            :isClubManager = TRUE
            AND r.club.id IN :clubIds
        )
        OR (
            :isTeamLead = TRUE
            AND r.team.id IN :teamIds
        )
    """)
    Page<RequestNews> findVisibleRequests(
            @Param("me") Long me,
            @Param("isStaff") boolean isStaff,
            @Param("isClubManager") boolean isClubManager,
            @Param("clubIds") java.util.Collection<Long> clubIds,
            @Param("isTeamLead") boolean isTeamLead,
            @Param("teamIds") java.util.Collection<Long> teamIds,
            Pageable pageable
    );
}
