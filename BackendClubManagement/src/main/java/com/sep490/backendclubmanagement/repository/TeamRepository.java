package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByClubId(Long clubId);
}
