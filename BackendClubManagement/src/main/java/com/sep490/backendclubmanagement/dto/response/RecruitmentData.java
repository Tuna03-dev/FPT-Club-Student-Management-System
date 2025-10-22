package com.sep490.backendclubmanagement.dto.response;

import com.sep490.backendclubmanagement.entity.RecruitmentStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecruitmentData {
    private Long id;
    private String title;
    private String description;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer maxApplicants;
    private RecruitmentStatus status;
    private String requirements;
    private Long clubId;
    private List<RecruitmentQuestionData> questions;
}


