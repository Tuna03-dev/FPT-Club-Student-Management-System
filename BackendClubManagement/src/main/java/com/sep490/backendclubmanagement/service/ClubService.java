package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.ClubDetailData;
import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.ClubMapper;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClubService implements ClubServiceInterface {

    private final ClubRepository clubRepository;
    private final ClubMapper clubMapper;

    @Override
    @Transactional(readOnly = true)
    public ClubDetailData getClubDetail(Long clubId) throws AppException {
        Club club = clubRepository.findByIdWithDetails(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));

        return clubMapper.toClubDetailData(club);
    }

    @Override
    @Transactional(readOnly = true)
    public ClubDetailData getClubDetailByCode(String clubCode) throws AppException {
        Club club = clubRepository.findByClubCodeWithDetails(clubCode)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));

        return clubMapper.toClubDetailData(club);
    }
}

