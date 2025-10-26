package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.ClubDetailData;
import com.sep490.backendclubmanagement.exception.AppException;

/**
 * Interface for Club Service
 */
public interface ClubServiceInterface {

    /**
     * Get club detail by ID
     * @param clubId Club ID
     * @return ClubDetailData
     * @throws AppException if club not found
     */
    ClubDetailData getClubDetail(Long clubId) throws AppException;

    /**
     * Get club detail by club code
     * @param clubCode Club code
     * @return ClubDetailData
     * @throws AppException if club not found
     */
    ClubDetailData getClubDetailByCode(String clubCode) throws AppException;
}

