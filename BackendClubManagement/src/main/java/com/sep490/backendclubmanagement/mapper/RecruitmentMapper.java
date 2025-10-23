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

    // Map club.id → clubId
    @Mapping(source = "club.id", target = "clubId")
    @Mapping(target = "questions", ignore = true)
    RecruitmentData toDto(Recruitment recruitment);

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
                .status(RecruitmentStatus.DRAFT)
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
    }

    @AfterMapping
    default void mapQuestions(@MappingTarget RecruitmentData target, Recruitment source) {
        if (source.getFormQuestions() != null) {
            List<RecruitmentQuestionData> questionData = source.getFormQuestions().stream()
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
            target.setQuestions(questionData);
        }
    }

    @AfterMapping
    default void mapOptions(@MappingTarget RecruitmentQuestionData target, RecruitmentFormQuestion source) {
        target.setOptions(mapOptionsInternal(source.getOptions()));
    }

    // Internal helper method
    default List<String> mapOptionsInternal(Set<QuestionOption> options) {
        if (options == null) return List.of();
        return options.stream()
                .map(QuestionOption::getOptionText)
                .collect(Collectors.toList());
    }
}
