package com.sep490.backendclubmanagement.mapper;

import com.sep490.backendclubmanagement.dto.response.ClubDetailData;
import com.sep490.backendclubmanagement.dto.response.ClubPresidentData;
import com.sep490.backendclubmanagement.entity.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.AfterMapping;
import org.mapstruct.MappingTarget;

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
    @Mapping(target = "president", ignore = true)
    ClubDetailData toClubDetailData(Club club);

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.fullName", target = "fullName")
    @Mapping(source = "user.email", target = "email")
    @Mapping(source = "user.phoneNumber", target = "phoneNumber")
    @Mapping(source = "user.studentCode", target = "studentCode")
    @Mapping(source = "user.avatarUrl", target = "avatarUrl")
    @Mapping(source = "joinDate", target = "joinDate")
    @Mapping(target = "roleName", ignore = true)
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

        // Map president info
        ClubPresidentData presidentData = findClubPresident(source);
        target.setPresident(presidentData);
    }

    /**
     * Find club president (CLUB_PRESIDENT role)
     */
    default ClubPresidentData findClubPresident(Club club) {
        if (club.getClubMemberships() == null) {
            return null;
        }

        // Find president from club memberships
        for (ClubMemberShip membership : club.getClubMemberships()) {
            if (membership.getRoleMemberships() == null) {
                continue;
            }

            for (RoleMemberShip roleMembership : membership.getRoleMemberships()) {
                // Check if this role is CLUB_PRESIDENT and is active
                if (roleMembership.getClubRole() != null 
                    && "CLUB_PRESIDENT".equals(roleMembership.getClubRole().getRoleCode())
                    && Boolean.TRUE.equals(roleMembership.getIsActive())) {
                    
                    User user = membership.getUser();
                    if (user != null) {
                        return ClubPresidentData.builder()
                                .userId(user.getId())
                                .fullName(user.getFullName())
                                .email(user.getEmail())
                                .phoneNumber(user.getPhoneNumber())
                                .studentCode(user.getStudentCode())
                                .avatarUrl(user.getAvatarUrl())
                                .joinDate(membership.getJoinDate())
                                .roleName(roleMembership.getClubRole().getRoleName())
                                .build();
                    }
                }
            }
        }

        return null;
    }
}

