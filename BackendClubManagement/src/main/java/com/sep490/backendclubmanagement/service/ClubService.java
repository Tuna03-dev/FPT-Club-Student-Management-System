package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.ClubDetailData;
import com.sep490.backendclubmanagement.dto.response.ClubPresidentData;
import com.sep490.backendclubmanagement.entity.*;
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
        
        ClubDetailData result = clubMapper.toClubDetailData(club);
        
        // Find president manually and set to result
        ClubPresidentData president = findClubPresidentManually(club);
        result.setPresident(president);
        
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public ClubDetailData getClubDetailByCode(String clubCode) throws AppException {
        Club club = clubRepository.findByClubCodeWithDetails(clubCode)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));
        
        ClubDetailData result = clubMapper.toClubDetailData(club);
        
        // Find president manually and set to result
        ClubPresidentData president = findClubPresidentManually(club);
        result.setPresident(president);
        
        return result;
    }
    
    /**
     * Find club president for current semester
     */
    private ClubPresidentData findClubPresidentManually(Club club) {
        if (club.getClubMemberships() == null) {
            return null;
        }

        for (ClubMemberShip membership : club.getClubMemberships()) {
            if (membership.getRoleMemberships() == null) {
                continue;
            }

            for (RoleMemberShip roleMembership : membership.getRoleMemberships()) {
                if (roleMembership.getClubRole() != null 
                    && "CLUB_PRESIDENT".equals(roleMembership.getClubRole().getRoleCode())
                    && Boolean.TRUE.equals(roleMembership.getIsActive())
                    && roleMembership.getSemester() != null
                    && Boolean.TRUE.equals(roleMembership.getSemester().getIsCurrent())) {
                    
                    User user = membership.getUser();
                    if (user != null) {
                        return ClubPresidentData.builder()
                                .fullName(user.getFullName())
                                .email(user.getEmail())
                                .avatarUrl(user.getAvatarUrl())
                                .build();
                    }
                }
            }
        }

        return null;
    }
}

