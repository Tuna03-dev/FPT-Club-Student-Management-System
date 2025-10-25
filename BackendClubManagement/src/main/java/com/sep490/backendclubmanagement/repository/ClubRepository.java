package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Club;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ClubRepository extends JpaRepository<Club, Long> {
    Optional<Club> findByClubCode(String clubCode);

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