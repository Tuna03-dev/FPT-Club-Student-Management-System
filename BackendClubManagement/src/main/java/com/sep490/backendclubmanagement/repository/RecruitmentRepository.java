package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Recruitment;
import com.sep490.backendclubmanagement.entity.RecruitmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecruitmentRepository extends JpaRepository<Recruitment, Long> {
    Page<Recruitment> findByClub_Id(Long clubId, Pageable pageable);
    Page<Recruitment> findByClub_IdAndStatus(Long clubId, RecruitmentStatus status, Pageable pageable);
}


