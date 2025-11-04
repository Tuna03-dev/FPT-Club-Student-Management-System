package com.sep490.backendclubmanagement.mapper;

import com.sep490.backendclubmanagement.dto.response.ReportDetailResponse;
import com.sep490.backendclubmanagement.dto.response.ReportListItemResponse;
import com.sep490.backendclubmanagement.entity.Report;
import org.mapstruct.Mapper;


@Mapper(componentModel = "spring")
public interface ReportMapper {

    /**
     * Map Report entity to ReportListItemResponse
     */
    default ReportListItemResponse toListItem(Report report) {
        if (report == null) {
            return null;
        }

        ReportListItemResponse.ClubMiniInfo clubInfo = null;
        if (report.getClub() != null) {
            clubInfo = ReportListItemResponse.ClubMiniInfo.builder()
                    .id(report.getClub().getId())
                    .clubName(report.getClub().getClubName())
                    .clubCode(report.getClub().getClubCode())
                    .build();
        }

        ReportListItemResponse.SemesterMiniInfo semesterInfo = null;
        if (report.getSemester() != null) {
            semesterInfo = ReportListItemResponse.SemesterMiniInfo.builder()
                    .id(report.getSemester().getId())
                    .semesterName(report.getSemester().getSemesterName())
                    .build();
        }

        ReportListItemResponse.UserMiniInfo userInfo = null;
        if (report.getCreatedBy() != null) {
            userInfo = ReportListItemResponse.UserMiniInfo.builder()
                    .id(report.getCreatedBy().getId())
                    .fullName(report.getCreatedBy().getFullName())
                    .email(report.getCreatedBy().getEmail())
                    .build();
        }

        return ReportListItemResponse.builder()
                .id(report.getId())
                .reportTitle(report.getReportTitle())
                .content(report.getContent())
                .fileUrl(report.getFileUrl())
                .status(report.getStatus())
                .submittedDate(report.getSubmittedDate())
                .reviewedDate(report.getReviewedDate())
                .createdAt(report.getCreatedAt())
                .club(clubInfo)
                .semester(semesterInfo)
                .createdBy(userInfo)
                .build();
    }

    /**
     * Map Report entity to ReportDetailResponse
     */
    default ReportDetailResponse toDetail(Report report) {
        if (report == null) {
            return null;
        }

        ReportDetailResponse.ClubInfo clubInfo = null;
        if (report.getClub() != null) {
            clubInfo = ReportDetailResponse.ClubInfo.builder()
                    .id(report.getClub().getId())
                    .clubName(report.getClub().getClubName())
                    .clubCode(report.getClub().getClubCode())
                    .build();
        }

        ReportDetailResponse.SemesterInfo semesterInfo = null;
        if (report.getSemester() != null) {
            semesterInfo = ReportDetailResponse.SemesterInfo.builder()
                    .id(report.getSemester().getId())
                    .semesterName(report.getSemester().getSemesterName())
                    .semesterCode(report.getSemester().getSemesterCode())
                    .build();
        }

        ReportDetailResponse.UserInfo userInfo = null;
        if (report.getCreatedBy() != null) {
            userInfo = ReportDetailResponse.UserInfo.builder()
                    .id(report.getCreatedBy().getId())
                    .fullName(report.getCreatedBy().getFullName())
                    .email(report.getCreatedBy().getEmail())
                    .studentCode(report.getCreatedBy().getStudentCode())
                    .build();
        }

        ReportDetailResponse.ReportRequirementInfo requirementInfo = null;
        if (report.getReportRequirement() != null) {
            ReportDetailResponse.UserInfo requirementCreatedByInfo = null;
            if (report.getReportRequirement().getCreatedBy() != null) {
                requirementCreatedByInfo = ReportDetailResponse.UserInfo.builder()
                        .id(report.getReportRequirement().getCreatedBy().getId())
                        .fullName(report.getReportRequirement().getCreatedBy().getFullName())
                        .email(report.getReportRequirement().getCreatedBy().getEmail())
                        .studentCode(report.getReportRequirement().getCreatedBy().getStudentCode())
                        .build();
            }

            requirementInfo = ReportDetailResponse.ReportRequirementInfo.builder()
                    .id(report.getReportRequirement().getId())
                    .title(report.getReportRequirement().getTitle())
                    .description(report.getReportRequirement().getDescription())
                    .dueDate(report.getReportRequirement().getDueDate() != null
                            ? report.getReportRequirement().getDueDate().atStartOfDay()
                            : null)
                    .reportType(report.getReportRequirement().getReportType())
                    .templateUrl(report.getReportRequirement().getTemplateUrl())
                    .createdBy(requirementCreatedByInfo)
                    .build();
        }

        return ReportDetailResponse.builder()
                .id(report.getId())
                .reportTitle(report.getReportTitle())
                .content(report.getContent())
                .fileUrl(report.getFileUrl())
                .status(report.getStatus())
                .submittedDate(report.getSubmittedDate())
                .reviewedDate(report.getReviewedDate())
                .reviewerFeedback(report.getReviewerFeedback())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .club(clubInfo)
                .semester(semesterInfo)
                .createdBy(userInfo)
                .reportRequirement(requirementInfo)
                .build();
    }
}

