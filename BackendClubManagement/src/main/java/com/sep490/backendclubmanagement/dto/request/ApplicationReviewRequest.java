package com.sep490.backendclubmanagement.dto.request;

import com.sep490.backendclubmanagement.entity.RecruitmentApplicationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ApplicationReviewRequest {
    @NotNull
    public Long applicationId;
    @NotNull
    public RecruitmentApplicationStatus status;
    public String reviewNotes;
}


