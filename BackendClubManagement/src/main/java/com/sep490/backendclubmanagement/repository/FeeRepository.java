package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {
    List<Fee> findByClub_Id(Long club_id);
}

