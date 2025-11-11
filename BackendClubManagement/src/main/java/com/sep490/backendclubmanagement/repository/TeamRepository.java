package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByClubId(Long clubId);

    // 🔹 Lấy danh sách team của một CLB cụ thể
    List<Team> findAllByClubId(Long clubId);

    // 🔹 Lấy danh sách team của nhiều CLB cùng lúc
    List<Team> findAllByClubIdIn(List<Long> clubIds);
    @Query("""
        select t
        from Team t
        where t.id = :teamId
          and t.club.id = :clubId
    """)
    Optional<Team> findByIdAndClubId(Long teamId, Long clubId);

    boolean existsByTeamNameAndClubId(String teamName, Long clubId);

    // ✅ tránh trùng tên khác hoa/thường
    boolean existsByClubIdAndTeamNameIgnoreCase(Long clubId, String teamName);


}
