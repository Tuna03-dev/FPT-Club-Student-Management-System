package com.sep490.backendclubmanagement.mapper;

import com.sep490.backendclubmanagement.dto.response.RecruitmentApplicationData;
import com.sep490.backendclubmanagement.entity.RecruitmentApplication;
import com.sep490.backendclubmanagement.entity.RecruitmentFormAnswer;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface RecruitmentApplicationMapper {

    @Mapping(source = "recruitment.id", target = "recruitmentId")
    @Mapping(source = "applicant.id", target = "applicantId")
    @Mapping(source = "applicant.fullName", target = "userName")
    @Mapping(source = "applicant.email", target = "userEmail")
    @Mapping(source = "applicant.phoneNumber", target = "userPhone")
    @Mapping(source = "applicant.studentCode", target = "studentId")
    @Mapping(source = "answers", target = "answers", qualifiedByName = "mapAnswersList")
    RecruitmentApplicationData toDto(RecruitmentApplication application);

    @Mapping(source = "question.id", target = "questionId")
    @Mapping(source = "question.questionText", target = "questionText")
    RecruitmentApplicationData.ApplicationAnswerData toAnswerDto(RecruitmentFormAnswer answer);

    @Named("mapAnswersList")
    default List<RecruitmentApplicationData.ApplicationAnswerData> mapAnswersList(Set<RecruitmentFormAnswer> answers) {
        if (answers == null || answers.isEmpty()) {
            return null;
        }
        return answers.stream()
                .map(this::toAnswerDto)
                .collect(Collectors.toList());
    }
}
