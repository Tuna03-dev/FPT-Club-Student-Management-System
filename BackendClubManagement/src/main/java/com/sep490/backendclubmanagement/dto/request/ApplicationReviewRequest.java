package com.sep490.backendclubmanagement.dto.request;

import com.sep490.backendclubmanagement.entity.RecruitmentApplicationStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class ApplicationReviewRequest {
    @NotNull
    public Long applicationId;
    @NotNull
    public RecruitmentApplicationStatus status;
    public String reviewNotes;
    public LocalDateTime interviewTime;
    public String interviewAddress;
    public String interviewPreparationRequirements;
}


