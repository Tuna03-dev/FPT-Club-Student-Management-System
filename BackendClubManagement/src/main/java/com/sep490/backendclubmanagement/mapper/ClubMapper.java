package com.sep490.backendclubmanagement.mapper;

import com.sep490.backendclubmanagement.dto.response.ClubDetailData;
import com.sep490.backendclubmanagement.dto.response.ClubPresidentData;
import com.sep490.backendclubmanagement.entity.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.AfterMapping;
import org.mapstruct.MappingTarget;

import java.time.LocalDateTime;

@Mapper(componentModel = "spring")
public interface ClubMapper {

    @Mapping(source = "campus.id", target = "campusId")
    @Mapping(source = "campus.campusName", target = "campusName")
    @Mapping(source = "campus.campusCode", target = "campusCode")
    @Mapping(source = "clubCategory.id", target = "categoryId")
    @Mapping(source = "clubCategory.categoryName", target = "categoryName")
    @Mapping(target = "totalMembers", ignore = true)
    @Mapping(target = "totalEvents", ignore = true)
    @Mapping(target = "totalPosts", ignore = true)
    @Mapping(target = "isRecruiting", ignore = true)
    @Mapping(target = "president", ignore = true)
    ClubDetailData toClubDetailData(Club club);

    @Mapping(source = "user.fullName", target = "fullName")
    @Mapping(source = "user.email", target = "email")
    @Mapping(source = "user.avatarUrl", target = "avatarUrl")
    ClubPresidentData toPresidentData(ClubMemberShip membership);

    @AfterMapping
    default void mapStatistics(@MappingTarget ClubDetailData target, Club source) {
        // Map total members
        if (source.getClubMemberships() != null) {
            target.setTotalMembers((long) source.getClubMemberships().size());
        } else {
            target.setTotalMembers(0L);
        }

        // Map total events
        if (source.getEvents() != null) {
            target.setTotalEvents((long) source.getEvents().size());
        } else {
            target.setTotalEvents(0L);
        }

        // Map total posts
        if (source.getPosts() != null) {
            target.setTotalPosts((long) source.getPosts().size());
        } else {
            target.setTotalPosts(0L);
        }
        
        // Check if club is recruiting
        target.setIsRecruiting(checkIsRecruiting(source));

        // Map president info
        ClubPresidentData presidentData = findClubPresident(source);
        target.setPresident(presidentData);
    }
    
    /**
     * Check if club has active recruitment
     */
    default Boolean checkIsRecruiting(Club club) {
        if (club.getRecruitments() == null) {
            return false;
        }
        
        LocalDateTime now = LocalDateTime.now();
        return club.getRecruitments().stream()
                .anyMatch(recruitment -> 
                    recruitment.getStatus() == RecruitmentStatus.OPEN
                    && recruitment.getStartDate() != null
                    && recruitment.getEndDate() != null
                    && !now.isBefore(recruitment.getStartDate())
                    && !now.isAfter(recruitment.getEndDate())
                );
    }

    /**
     * Find club president (CLUB_PRESIDENT role) for current semester
     */
    default ClubPresidentData findClubPresident(Club club) {
        if (club.getClubMemberships() == null) {
            return null;
        }

        // Find president from club memberships for current semester
        for (ClubMemberShip membership : club.getClubMemberships()) {
            if (membership.getRoleMemberships() == null) {
                continue;
            }

            for (RoleMemberShip roleMembership : membership.getRoleMemberships()) {
                // Check if this role is CLUB_PRESIDENT, is active, and belongs to current semester
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

