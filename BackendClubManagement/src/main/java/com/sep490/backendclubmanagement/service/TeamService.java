package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.TeamResponse;

import java.util.List;

public interface TeamService {
    List<TeamResponse> getTeamsByClubId(Long clubId);
}
