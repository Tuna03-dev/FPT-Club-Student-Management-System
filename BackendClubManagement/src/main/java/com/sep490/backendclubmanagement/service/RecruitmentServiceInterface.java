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
    RecruitmentData createRecruitment(Long userId, Long clubId, RecruitmentCreateRequest request) throws AppException;
    RecruitmentData updateRecruitment(Long userId, Long id, RecruitmentUpdateRequest request) throws AppException;
    void changeRecruitmentStatus(Long userId, Long id, RecruitmentStatus status) throws AppException;
    void deleteRecruitment(Long userId, Long id) throws AppException;

    // Application management
    PagedResponse<RecruitmentApplicationData> listApplications(Long userId, Long recruitmentId, RecruitmentApplicationStatus status, Pageable pageable) throws AppException;
    PagedResponse<RecruitmentApplicationData> listMyApplications(Long applicantId, RecruitmentApplicationStatus status, Pageable pageable);
    RecruitmentApplicationData submitApplication(Long applicantId, ApplicationSubmitRequest request) throws AppException;
    RecruitmentApplicationData getApplication(Long userId, Long applicationId) throws AppException;
    RecruitmentApplicationData getMyApplication(Long applicantId, Long applicationId) throws AppException;
    RecruitmentApplicationData reviewApplication(Long userId, ApplicationReviewRequest request) throws AppException;
}
