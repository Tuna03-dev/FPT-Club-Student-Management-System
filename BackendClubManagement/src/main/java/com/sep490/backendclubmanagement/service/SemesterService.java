package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.SemesterResponse;
import com.sep490.backendclubmanagement.exception.AppException;

import java.util.List;

public interface SemesterService {
    List<SemesterResponse> getSemestersFromClubEstablishment(Long clubId) throws AppException;
}
