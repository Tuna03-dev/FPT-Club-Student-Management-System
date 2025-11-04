package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.ClubReportRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClubReportRequirementRepository extends JpaRepository<ClubReportRequirement, Long> {

    /**
     * Find ClubReportRequirement by clubId and submissionReportRequirementId
     */
    @Query("SELECT crr FROM ClubReportRequirement crr " +
           "WHERE crr.club.id = :clubId " +
           "AND crr.submissionReportRequirement.id = :submissionReportRequirementId")
    Optional<ClubReportRequirement> findByClubIdAndSubmissionReportRequirementId(
            @Param("clubId") Long clubId,
            @Param("submissionReportRequirementId") Long submissionReportRequirementId
    );
}

