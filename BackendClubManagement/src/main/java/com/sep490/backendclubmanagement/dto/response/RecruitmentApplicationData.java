package com.sep490.backendclubmanagement.dto.response;

import com.sep490.backendclubmanagement.entity.RecruitmentApplicationStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecruitmentApplicationData {
    private Long id;
    private Long recruitmentId;
    private Long applicantId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String studentId;
    private Long teamId;
    private RecruitmentApplicationStatus status;
    private String reviewNotes;
    private LocalDateTime submittedDate;
    private LocalDateTime reviewedDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ApplicationAnswerData> answers;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ApplicationAnswerData {
        private Long questionId;
        private String questionText;
        private String answerText;
        private String fileUrl;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}


