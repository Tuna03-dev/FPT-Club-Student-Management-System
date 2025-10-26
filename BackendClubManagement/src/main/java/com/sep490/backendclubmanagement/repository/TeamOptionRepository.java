package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.TeamOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamOptionRepository extends JpaRepository<TeamOption, Long> {

    // Lấy danh sách team options của một recruitment
    List<TeamOption> findByRecruitment_Id(Long recruitmentId);

    // Xóa tất cả team options của một recruitment
    void deleteByRecruitment_Id(Long recruitmentId);
}