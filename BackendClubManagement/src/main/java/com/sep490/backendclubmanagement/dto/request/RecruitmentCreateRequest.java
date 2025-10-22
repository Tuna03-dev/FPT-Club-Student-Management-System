package com.sep490.backendclubmanagement.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

public class RecruitmentCreateRequest {
    @NotBlank
    public String title;
    public String description;
    @NotNull
    public LocalDateTime startDate;
    @NotNull @Future
    public LocalDateTime endDate;
    public Integer maxApplicants;
    public String requirements;
    public List<RecruitmentQuestionRequest> questions;
}


