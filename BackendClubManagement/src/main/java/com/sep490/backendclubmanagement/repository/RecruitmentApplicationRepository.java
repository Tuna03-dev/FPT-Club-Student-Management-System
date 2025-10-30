package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.RecruitmentApplication;
import com.sep490.backendclubmanagement.entity.RecruitmentApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RecruitmentApplicationRepository extends JpaRepository<RecruitmentApplication, Long> {
    Page<RecruitmentApplication> findByRecruitment_Id(Long recruitmentId, Pageable pageable);
    Page<RecruitmentApplication> findByRecruitment_IdAndStatus(Long recruitmentId, RecruitmentApplicationStatus status, Pageable pageable);
    Page<RecruitmentApplication> findByApplicant_Id(Long applicantId, Pageable pageable);
    Page<RecruitmentApplication> findByApplicant_IdAndStatus(Long applicantId, RecruitmentApplicationStatus status, Pageable pageable);
    
    Optional<RecruitmentApplication> findByApplicant_IdAndRecruitment_Id(Long applicantId, Long recruitmentId);
    
    // Search by keyword in userName, userEmail, or studentCode
    @Query("SELECT ra FROM RecruitmentApplication ra WHERE ra.recruitment.id = :recruitmentId " +
           "AND (LOWER(ra.applicant.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(ra.applicant.email) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(ra.applicant.studentCode) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<RecruitmentApplication> searchByRecruitmentIdAndKeyword(@Param("recruitmentId") Long recruitmentId,
                                                                  @Param("keyword") String keyword,
                                                                  Pageable pageable);
    
    // Search by keyword and status
    @Query("SELECT ra FROM RecruitmentApplication ra WHERE ra.recruitment.id = :recruitmentId " +
           "AND ra.status = :status " +
           "AND (LOWER(ra.applicant.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(ra.applicant.email) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(ra.applicant.studentCode) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<RecruitmentApplication> searchByRecruitmentIdAndStatusAndKeyword(@Param("recruitmentId") Long recruitmentId,
                                                                           @Param("status") RecruitmentApplicationStatus status,
                                                                           @Param("keyword") String keyword,
                                                                           Pageable pageable);
}


