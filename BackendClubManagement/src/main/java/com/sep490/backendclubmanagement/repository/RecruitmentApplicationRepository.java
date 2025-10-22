package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.RecruitmentApplication;
import com.sep490.backendclubmanagement.entity.RecruitmentApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecruitmentApplicationRepository extends JpaRepository<RecruitmentApplication, Long> {
    Page<RecruitmentApplication> findByRecruitment_Id(Long recruitmentId, Pageable pageable);
    Page<RecruitmentApplication> findByRecruitment_IdAndStatus(Long recruitmentId, RecruitmentApplicationStatus status, Pageable pageable);
    Page<RecruitmentApplication> findByApplicant_Id(Long applicantId, Pageable pageable);
}


