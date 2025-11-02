package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {
    List<Fee> findByClub_Id(Long club_id);
    boolean existsByTitleIgnoreCaseAndClub_Id(String title, Long clubId);
    boolean existsByTitleIgnoreCaseAndClub_IdAndIdNot(String title, Long clubId, Long excludeId);
}

