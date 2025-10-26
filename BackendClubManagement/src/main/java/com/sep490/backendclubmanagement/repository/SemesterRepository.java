package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {

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
}


