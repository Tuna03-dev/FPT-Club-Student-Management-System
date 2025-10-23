package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.ClubCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClubCategoryRepository extends JpaRepository<ClubCategory, Long> {
}

