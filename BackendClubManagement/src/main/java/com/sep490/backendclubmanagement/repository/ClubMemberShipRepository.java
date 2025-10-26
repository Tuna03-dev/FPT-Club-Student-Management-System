package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.ClubMemberShip;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ClubMemberShipRepository extends JpaRepository<ClubMemberShip, Long> {


    @Query("""
    SELECT DISTINCT cms FROM ClubMemberShip cms 
    LEFT JOIN FETCH cms.roleMemberships rm 
    LEFT JOIN FETCH rm.semester s
    LEFT JOIN FETCH rm.clubRole cr
    WHERE cms.club.id = :clubId 
    AND (:status IS NULL OR cms.status = :status)
    AND (:searchTerm IS NULL OR 
         LOWER(cms.user.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) 
         OR LOWER(cms.user.studentCode) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
""")
    List<ClubMemberShip> findMembersWithFiltersList(
            @Param("clubId") Long clubId,
            @Param("status") ClubMemberShipStatus status,
            @Param("searchTerm") String searchTerm
    );

}
