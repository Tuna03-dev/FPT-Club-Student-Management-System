package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.ClubRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClubRoleRepository extends JpaRepository<ClubRole, Long> {
    List<ClubRole> findByClubId(Long clubId);
}

