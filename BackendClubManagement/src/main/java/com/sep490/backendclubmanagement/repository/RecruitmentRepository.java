package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Recruitment;
import com.sep490.backendclubmanagement.entity.RecruitmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecruitmentRepository extends JpaRepository<Recruitment, Long> {
    Page<Recruitment> findByClub_Id(Long clubId, Pageable pageable);
    Page<Recruitment> findByClub_IdAndStatus(Long clubId, RecruitmentStatus status, Pageable pageable);
    List<Recruitment> findByClub_IdAndStatusAndIdNot(Long clubId, RecruitmentStatus status, Long excludeId);
    
    // Search by keyword in title or description
    @Query("SELECT r FROM Recruitment r WHERE r.club.id = :clubId " +
           "AND (LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Recruitment> searchByClubIdAndKeyword(@Param("clubId") Long clubId, 
                                                @Param("keyword") String keyword, 
                                                Pageable pageable);
    
    // Search by keyword and status
    @Query("SELECT r FROM Recruitment r WHERE r.club.id = :clubId " +
           "AND r.status = :status " +
           "AND (LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Recruitment> searchByClubIdAndStatusAndKeyword(@Param("clubId") Long clubId, 
                                                         @Param("status") RecruitmentStatus status,
                                                         @Param("keyword") String keyword, 
                                                         Pageable pageable);
}


