package com.sep490.backendclubmanagement.mapper;

import com.sep490.backendclubmanagement.dto.request.RecruitmentCreateRequest;
import com.sep490.backendclubmanagement.dto.request.RecruitmentUpdateRequest;
import com.sep490.backendclubmanagement.dto.response.RecruitmentData;
import com.sep490.backendclubmanagement.dto.response.RecruitmentQuestionData;
import com.sep490.backendclubmanagement.entity.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.AfterMapping;
import org.mapstruct.MappingTarget;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface RecruitmentMapper {

    // Override toDto to manually map questions
    default RecruitmentData toDto(Recruitment recruitment) {
        if (recruitment == null) {
            return null;
        }
        
        RecruitmentData.RecruitmentDataBuilder builder = RecruitmentData.builder()
                .id(recruitment.getId())
                .title(recruitment.getTitle())
                .description(recruitment.getDescription())
                .startDate(recruitment.getStartDate())
                .endDate(recruitment.getEndDate())
                .maxApplicants(recruitment.getMaxApplicants())
                .status(recruitment.getStatus())
                .requirements(recruitment.getRequirements())
                .clubId(recruitment.getClub() != null ? recruitment.getClub().getId() : null)
                .createdAt(recruitment.getCreatedAt())
                .updatedAt(recruitment.getUpdatedAt());
        
        // Map questions - sort by questionOrder to maintain order
        if (recruitment.getFormQuestions() != null && !recruitment.getFormQuestions().isEmpty()) {
            List<RecruitmentQuestionData> questionData = recruitment.getFormQuestions().stream()
                    .sorted((q1, q2) -> {
                        if (q1.getQuestionOrder() == null) return 1;
                        if (q2.getQuestionOrder() == null) return -1;
                        return q1.getQuestionOrder().compareTo(q2.getQuestionOrder());
                    })
                    .map(q -> RecruitmentQuestionData.builder()
                            .id(q.getId())
                            .questionText(q.getQuestionText())
                            .questionType(q.getQuestionType())
                            .questionOrder(q.getQuestionOrder())
                            .options(mapOptionsInternal(q.getOptions()))
                            .createdAt(q.getCreatedAt())
                            .updatedAt(q.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList());
            builder.questions(questionData);
        }
        
        return builder.build();
    }

    // Map question options to string list
    @Mapping(target = "options", ignore = true)
    RecruitmentQuestionData toQuestionDto(RecruitmentFormQuestion question);

    // Convert RecruitmentCreateRequest to entity (manual mapping for complex logic)
    default Recruitment toEntity(RecruitmentCreateRequest request, Long clubId) {
        return Recruitment.builder()
                .title(request.title)
                .description(request.description)
                .startDate(request.startDate)
                .endDate(request.endDate)
                .maxApplicants(request.maxApplicants)
                .requirements(request.requirements)
                .status(request.status != null ? request.status : RecruitmentStatus.DRAFT)
                .club(Club.builder().id(clubId).build())
                .build();
    }

    // Update entity from request
    default void updateEntity(Recruitment entity, RecruitmentUpdateRequest request) {
        entity.setTitle(request.title);
        entity.setDescription(request.description);
        entity.setStartDate(request.startDate);
        entity.setEndDate(request.endDate);
        entity.setMaxApplicants(request.maxApplicants);
        entity.setRequirements(request.requirements);
        if (request.status != null) {
            entity.setStatus(request.status);
        }
    }


    // Internal helper method - sort options by optionOrder
    default List<String> mapOptionsInternal(Set<QuestionOption> options) {
        if (options == null) return List.of();
        return options.stream()
                .sorted((o1, o2) -> {
                    if (o1.getOptionOrder() == null) return 1;
                    if (o2.getOptionOrder() == null) return -1;
                    return o1.getOptionOrder().compareTo(o2.getOptionOrder());
                })
                .map(QuestionOption::getOptionText)
                .collect(Collectors.toList());
    }
}
