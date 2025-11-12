package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.request.SemesterFilterRequest;
import com.sep490.backendclubmanagement.entity.Semester;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {

    boolean existsBySemesterCode(String semesterCode);
    boolean existsBySemesterName(String semesterName);
    boolean existsBySemesterNameAndIdNot(String semesterName, Long id);

    @Query("SELECT s FROM Semester s WHERE NOW() BETWEEN s.startDate AND s.endDate")
    Optional<Semester> findCurrentSemester();

    @Query("""
        SELECT s, rm
        FROM Semester s
        LEFT JOIN RoleMemberShip rm
            ON rm.semester = s
            AND rm.clubMemberShip.id = :clubMembershipId
        WHERE s.startDate <= COALESCE(:endDate, CURRENT_DATE)
          AND s.endDate >= :joinDate
        ORDER BY s.startDate DESC
    """)
    List<Object[]> findSemestersWithRoleByMembership(
            @Param("clubMembershipId") Long clubMembershipId,
            @Param("joinDate") LocalDate joinDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("""
    SELECT DISTINCT s FROM Semester s
    WHERE s.startDate <= :now 
      AND s.endDate >= :clubEstablishedAt
      AND EXISTS (
          SELECT rm FROM RoleMemberShip rm
          WHERE rm.semester = s
            AND rm.clubMemberShip.club.id = :clubId
      )
    ORDER BY s.startDate DESC
""")
    List<Semester> findActiveSemestersByClubIdAndDateRange(
            @Param("clubId") Long clubId,
            @Param("now") LocalDate now,
            @Param("clubEstablishedAt") LocalDate clubEstablishedAt
    );

    @Query(value = """
            SELECT s.*
            FROM semesters s
            WHERE (:#{#req.isCurrent} IS NULL OR s.is_current = :#{#req.isCurrent})
              AND (
                   :#{#req.keyword} IS NULL
                OR LOWER(s.semester_name) LIKE LOWER(CONCAT('%', :#{#req.keyword}, '%'))
                OR LOWER(s.semester_code) LIKE LOWER(CONCAT('%', :#{#req.keyword}, '%'))
              )
            """,
            nativeQuery = true,
            countProjection = "s.id")
    Page<Semester> getAllByFilter(@Param("req") SemesterFilterRequest req, Pageable pageable);
}


