package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.*;
import com.sep490.backendclubmanagement.dto.response.RecruitmentApplicationData;
import com.sep490.backendclubmanagement.dto.response.PagedResponse;
import com.sep490.backendclubmanagement.dto.response.RecruitmentData;
import com.sep490.backendclubmanagement.entity.RecruitmentApplicationStatus;
import com.sep490.backendclubmanagement.entity.RecruitmentStatus;
import com.sep490.backendclubmanagement.exception.AppException;
import org.springframework.data.domain.Pageable;

public interface RecruitmentServiceInterface {

    // Recruitment CRUD
    PagedResponse<RecruitmentData> listRecruitments(Long clubId, RecruitmentStatus status, Pageable pageable);
    RecruitmentData getRecruitment(Long id) throws AppException;
    RecruitmentData createRecruitment(Long clubId, RecruitmentCreateRequest request);
    RecruitmentData updateRecruitment(Long id, RecruitmentUpdateRequest request) throws AppException;
    void changeRecruitmentStatus(Long id, RecruitmentStatus status) throws AppException;
    void deleteRecruitment(Long id);

    // Application management
    PagedResponse<RecruitmentApplicationData> listApplications(Long recruitmentId, RecruitmentApplicationStatus status, Pageable pageable);
    RecruitmentApplicationData submitApplication(Long applicantId, ApplicationSubmitRequest request) throws AppException;
    RecruitmentApplicationData getApplication(Long applicationId) throws AppException;
    RecruitmentApplicationData reviewApplication(ApplicationReviewRequest request) throws AppException;
}
