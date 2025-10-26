package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    // 🔹 Lấy danh sách team của một CLB cụ thể
    List<Team> findAllByClubId(Long clubId);

    // 🔹 Lấy danh sách team của nhiều CLB cùng lúc
    List<Team> findAllByClubIdIn(List<Long> clubIds);
}
