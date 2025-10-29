package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.RoleMemberShip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleMemberShipRepository extends JpaRepository<RoleMemberShip, Long> {
    
    // Trả về system role của user
    @Query(value = "SELECT sr.role_name FROM users u " +
           "JOIN system_roles sr ON u.system_role_id = sr.id " +
           "WHERE u.id = :userId",
           nativeQuery = true)
    Optional<String> findSystemRoleByUserId(@Param("userId") Long userId);

    // Trả về đầy đủ bản ghi RoleMemberShip (nếu cần)
    @Query(value = "SELECT rm.* FROM role_memberships rm " +
           "JOIN club_memberships cms ON rm.club_membership_id = cms.id " +
           "WHERE cms.user_id = :userId AND cms.club_id = :clubId " +
           "AND rm.is_active = true",
           nativeQuery = true)
    List<RoleMemberShip> findActiveRoleMemberships(
            @Param("userId") Long userId,
            @Param("clubId") Long clubId
    );

    // Lấy danh sách club_id mà user là CLUB_PRESIDENT dựa theo users.system_role
    @Query(value = "SELECT DISTINCT cms.club_id FROM club_memberships cms " +
           "JOIN users u ON cms.user_id = u.id " +
           "JOIN system_roles sr ON u.system_role_id = sr.id " +
           "WHERE cms.user_id = :userId AND sr.role_name = 'CLUB_PRESIDENT'",
           nativeQuery = true)
    List<Long> findPresidentClubIdsByUserId(@Param("userId") Long userId);
}

