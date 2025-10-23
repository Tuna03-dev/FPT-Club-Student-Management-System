package com.sep490.backendclubmanagement.mapper;

import com.sep490.backendclubmanagement.dto.response.RecruitmentApplicationData;
import com.sep490.backendclubmanagement.entity.RecruitmentApplication;
import com.sep490.backendclubmanagement.entity.RecruitmentFormAnswer;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.AfterMapping;
import org.mapstruct.MappingTarget;

import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface RecruitmentApplicationMapper {

    // Map recruitment.id → recruitmentId and applicant.id → applicantId
    @Mapping(source = "recruitment.id", target = "recruitmentId")
    @Mapping(source = "applicant.id", target = "applicantId")
    @Mapping(target = "answers", ignore = true)
    RecruitmentApplicationData toDto(RecruitmentApplication application);

    // Map question.id → questionId and question.questionText → questionText
    @Mapping(source = "question.id", target = "questionId")
    @Mapping(source = "question.questionText", target = "questionText")
    RecruitmentApplicationData.ApplicationAnswerData toAnswerDto(RecruitmentFormAnswer answer);

    @AfterMapping
    default void mapAnswers(@MappingTarget RecruitmentApplicationData.ApplicationAnswerData target, RecruitmentFormAnswer source) {
        // This will be handled by the main mapping
    }

    @AfterMapping
    default void mapAnswersList(@MappingTarget RecruitmentApplicationData target, RecruitmentApplication source) {
        if (source.getAnswers() != null) {
            List<RecruitmentApplicationData.ApplicationAnswerData> answerData = source.getAnswers().stream()
                    .map(a -> RecruitmentApplicationData.ApplicationAnswerData.builder()
                            .questionId(a.getQuestion().getId())
                            .questionText(a.getQuestion().getQuestionText())
                            .answerText(a.getAnswerText())
                            .fileUrl(a.getFileUrl())
                            .createdAt(a.getCreatedAt())
                            .updatedAt(a.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList());
            target.setAnswers(answerData);
        }
    }
}
