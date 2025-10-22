package com.sep490.backendclubmanagement.dto.response;

import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecruitmentQuestionData {
    private Long id;
    private String questionText;
    private String questionType;
    private Integer questionOrder;
    private List<String> options;
}


