package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.ClubRoleResponse;

import java.util.List;

public interface ClubRoleService {
    List<ClubRoleResponse> getClubRolesByClubId(Long clubId);
}

