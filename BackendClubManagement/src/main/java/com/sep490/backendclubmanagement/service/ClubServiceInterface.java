package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.ClubFilterRequest;
import com.sep490.backendclubmanagement.dto.request.CreateClubRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateClubRequest;
import com.sep490.backendclubmanagement.dto.response.ClubDetailData;
import com.sep490.backendclubmanagement.dto.response.ClubDto;
import com.sep490.backendclubmanagement.dto.response.ClubManagementResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.exception.AppException;

import java.util.List;

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

    /**
     * Get all clubs (id and name only)
     * @return List of ClubDto with id and clubName
     */
    List<ClubDto> getAllClubs();

    /**
     * Get clubs with filter, search and pagination for staff management
     * @param request Filter request
     * @param staffId Staff user ID for permission check
     * @return PageResponse of ClubManagementResponse
     * @throws AppException if user doesn't have STAFF role
     */
    PageResponse<ClubManagementResponse> getClubsByFilter(ClubFilterRequest request, Long staffId) throws AppException;

    /**
     * Create new club (Staff only)
     * @param request Create club request
     * @param staffId Staff user ID for permission check
     * @return Created club response
     * @throws AppException if validation fails
     */
    ClubManagementResponse createClub(CreateClubRequest request, Long staffId) throws AppException;

    /**
     * Update club (Staff only)
     * @param clubId Club ID
     * @param request Update club request
     * @param staffId Staff user ID for permission check
     * @return Updated club response
     * @throws AppException if club not found or validation fails
     */
    ClubManagementResponse updateClub(Long clubId, UpdateClubRequest request, Long staffId) throws AppException;

    /**
     * Delete club (Staff only)
     * @param clubId Club ID
     * @param staffId Staff user ID for permission check
     * @throws AppException if club not found
     */
    void deleteClub(Long clubId, Long staffId) throws AppException;

    /**
     * Get club for management detail (Staff only)
     * @param clubId Club ID
     * @param staffId Staff user ID for permission check
     * @return ClubManagementResponse
     * @throws AppException if club not found
     */
    ClubManagementResponse getClubForManagement(Long clubId, Long staffId) throws AppException;
}

