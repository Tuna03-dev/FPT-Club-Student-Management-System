package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.ClubCreationStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClubCreationStepRepository extends JpaRepository<ClubCreationStep, Long> {
    Optional<ClubCreationStep> findByCode(String code);
}



