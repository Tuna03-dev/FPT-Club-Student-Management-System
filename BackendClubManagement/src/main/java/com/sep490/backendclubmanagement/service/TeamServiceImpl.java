package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.TeamResponse;
import com.sep490.backendclubmanagement.entity.Team;
import com.sep490.backendclubmanagement.mapper.TeamMapper;
import com.sep490.backendclubmanagement.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final TeamMapper teamMapper;

    @Override
    public List<TeamResponse> getTeamsByClubId(Long clubId) {
        List<Team> teams = teamRepository.findByClubId(clubId);
        return teams.stream()
                .map(teamMapper::toDto)
                .toList();
    }
}
