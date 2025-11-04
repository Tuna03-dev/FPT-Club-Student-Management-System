package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.SubmissionReportRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubmissionReportRequirementRepository extends JpaRepository<SubmissionReportRequirement, Long> {
}

