package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.ClubReportRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClubReportRequirementRepository extends JpaRepository<ClubReportRequirement, Long> {

    /**
     * Find ClubReportRequirement by clubId and submissionReportRequirementId
     * Fetch report if exists to avoid LazyInitializationException and check if report already exists
     */
    @Query("SELECT crr FROM ClubReportRequirement crr " +
           "LEFT JOIN FETCH crr.report " +
           "JOIN FETCH crr.club " +
           "JOIN FETCH crr.submissionReportRequirement " +
           "WHERE crr.club.id = :clubId " +
           "AND crr.submissionReportRequirement.id = :submissionReportRequirementId")
    Optional<ClubReportRequirement> findByClubIdAndSubmissionReportRequirementId(
            @Param("clubId") Long clubId,
            @Param("submissionReportRequirementId") Long submissionReportRequirementId
    );

    /**
     * Find all ClubReportRequirements by submissionReportRequirementId
     * Fetch club eagerly to avoid LazyInitializationException
     */
    @Query("SELECT crr FROM ClubReportRequirement crr " +
           "JOIN FETCH crr.club " +
           "WHERE crr.submissionReportRequirement.id = :submissionReportRequirementId")
    List<ClubReportRequirement> findBySubmissionReportRequirementId(
            @Param("submissionReportRequirementId") Long submissionReportRequirementId
    );

    /**
     * Find all ClubReportRequirements by clubId
     * Fetch submissionReportRequirement eagerly to avoid LazyInitializationException
     */
    @Query("SELECT crr FROM ClubReportRequirement crr " +
           "JOIN FETCH crr.submissionReportRequirement " +
           "WHERE crr.club.id = :clubId " +
           "ORDER BY crr.submissionReportRequirement.dueDate DESC")
    List<ClubReportRequirement> findByClubId(
            @Param("clubId") Long clubId
    );
}

