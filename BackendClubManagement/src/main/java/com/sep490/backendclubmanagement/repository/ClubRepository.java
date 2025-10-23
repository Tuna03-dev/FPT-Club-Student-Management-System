package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Club;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClubRepository extends JpaRepository<Club, Long> {
}
