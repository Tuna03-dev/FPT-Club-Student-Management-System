package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.ClubRoleResponse;

import java.util.List;

public interface ClubRoleService {
    List<ClubRoleResponse> getClubRolesByClubId(Long clubId);

    boolean isClubLeaderOrVice(Long userId, Long clubId);
    boolean isTeamLeader(Long userId, Long teamId);
}

