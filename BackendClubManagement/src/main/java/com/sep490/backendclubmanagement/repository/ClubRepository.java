package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Club;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClubRepository extends JpaRepository<Club, Long> {
    Optional<Club> findByClubCode(String clubCode);
}