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
    Optional<RecruitmentApplication> findByApplicant_IdAndRecruitment_Id(Long applicantId, Long recruitmentId);
    
    // Dynamic search for my applications - supports all combinations of parameters
    @Query("SELECT ra FROM RecruitmentApplication ra " +
           "WHERE ra.applicant.id = :applicantId " +
           "AND (:status IS NULL OR ra.status = :status) " +
           "AND (:keyword IS NULL OR :keyword = '' OR " +
           "     LOWER(ra.recruitment.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ra.recruitment.club.clubName) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<RecruitmentApplication> findMyApplications(@Param("applicantId") Long applicantId,
                                                     @Param("status") RecruitmentApplicationStatus status,
                                                     @Param("keyword") String keyword,
                                                     Pageable pageable);

    // Dynamic search for applications by recruitment - supports all combinations of parameters
    @Query("SELECT ra FROM RecruitmentApplication ra " +
           "WHERE ra.recruitment.id = :recruitmentId " +
           "AND (:status IS NULL OR ra.status = :status) " +
           "AND (:keyword IS NULL OR :keyword = '' OR " +
           "     LOWER(ra.applicant.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ra.applicant.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ra.applicant.studentCode) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<RecruitmentApplication> findApplicationsByRecruitment(@Param("recruitmentId") Long recruitmentId,
                                                                @Param("status") RecruitmentApplicationStatus status,
                                                                @Param("keyword") String keyword,
                                                                Pageable pageable);
}
