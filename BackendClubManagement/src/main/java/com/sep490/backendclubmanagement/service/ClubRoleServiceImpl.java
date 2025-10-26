package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.ClubRoleResponse;
import com.sep490.backendclubmanagement.entity.ClubRole;
import com.sep490.backendclubmanagement.repository.ClubRoleRepository;
import com.sep490.backendclubmanagement.mapper.ClubRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubRoleServiceImpl implements ClubRoleService {

    private final ClubRoleRepository clubRoleRepository;
    private final ClubRoleMapper clubRoleMapper;

    @Override
    public List<ClubRoleResponse> getClubRolesByClubId(Long clubId) {
        List<ClubRole> clubRoles = clubRoleRepository.findByClubId(clubId);
        return clubRoleMapper.toDtos(clubRoles);
    }
}
