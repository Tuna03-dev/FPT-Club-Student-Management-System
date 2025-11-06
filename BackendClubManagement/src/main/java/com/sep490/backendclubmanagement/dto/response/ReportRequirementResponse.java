package com.sep490.backendclubmanagement.dto.response;

import com.sep490.backendclubmanagement.entity.ReportType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportRequirementResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDate dueDate;
    private ReportType reportType;
    private String templateUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserInfo createdBy;

    private List<ClubRequirementInfo> clubRequirements;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ClubRequirementInfo {
        private Long id;
        private Long clubId;
        private String clubName;
        private String clubCode;
        private String status;
        private String note;
        private ReportInfo report;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserInfo {
        private Long id;
        private String fullName;
        private String email;
        private String studentCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReportInfo {
        private Long id;
        private String reportTitle;
        private String status;
        private LocalDateTime submittedDate;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}

