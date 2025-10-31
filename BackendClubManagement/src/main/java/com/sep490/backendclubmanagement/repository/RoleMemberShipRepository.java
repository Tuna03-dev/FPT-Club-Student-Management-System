package com.sep490.backendclubmanagement.repository;


import com.sep490.backendclubmanagement.dto.response.TeamMemberDTO;
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

    List<RoleMemberShip> findByClubMemberShipId(Long clubMemberShipId);

    List<RoleMemberShip> findByClubMemberShipIdAndSemesterId(Long clubMemberShipId, Long semesterId);

    Optional<RoleMemberShip> findByClubMemberShipIdAndSemesterIdAndIsActive(Long clubMemberShipId, Long semesterId, Boolean isActive);

    List<RoleMemberShip> findByClubMemberShipIdAndIsActive(Long clubMemberShipId, Boolean isActive);

    @Query("""
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        LEFT JOIN rm.clubRole cr
        WHERE cm.user.id = :userId
          AND cm.club.id = :clubId
          AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
          AND COALESCE(rm.isActive, TRUE) = TRUE
          AND rm.team IS NULL
          AND UPPER(TRIM(COALESCE(cr.roleName, ''))) IN (
              'CLUB_PRESIDENT','PRESIDENT',
              'VICE_PRESIDENT','CLUB_VP',
              'CHỦ NHIỆM','CHU NHIEM',
              'PHÓ CHỦ NHIỆM','PHO CHU NHIEM'
          )
    ) THEN TRUE ELSE FALSE END
""")
    boolean isClubAdmin(@Param("userId") Long userId,
                        @Param("clubId") Long clubId,
                        @Param("semesterId") Long semesterId);


    @Query("""
    SELECT new com.sep490.backendclubmanagement.dto.response.TeamMemberDTO(
        u.id,
        u.fullName,
        u.avatarUrl,
        COALESCE(cr.roleName, 'Thành viên'),
        u.email,
        u.studentCode
    )
    FROM RoleMemberShip rm
    JOIN rm.clubMemberShip cms
    JOIN cms.user u
    LEFT JOIN rm.clubRole cr
    WHERE rm.team.id = :teamId
      AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
      AND COALESCE(rm.isActive, TRUE) = TRUE
""")
    List<TeamMemberDTO> findMembersByTeamIdAndSemesterId(@Param("teamId") Long teamId,
                                                         @Param("semesterId") Long semesterId);


    // ---- RBAC: các team user đang tham gia (khi KHÔNG phải CLUB_PRESIDENT)
    @Query("""
        SELECT DISTINCT t.id, t.teamName, t.description
        FROM RoleMemberShip rm
        JOIN rm.team t
        JOIN rm.clubMemberShip cm
        WHERE cm.user.id = :userId
          AND cm.club.id = :clubId
          AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
          AND COALESCE(rm.isActive, TRUE) = TRUE
    """)
    List<Object[]> findMyTeamsInClub(@Param("userId") Long userId,
                                     @Param("clubId") Long clubId,
                                     @Param("semesterId") Long semesterId);

    // ---- Đếm member distinct theo team (dùng cho cả LIST & DETAIL)
    @Query("""
        SELECT t.id, COUNT(DISTINCT rm.clubMemberShip.id)
        FROM RoleMemberShip rm
        JOIN rm.team t
        WHERE t.club.id = :clubId
          AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
          AND COALESCE(rm.isActive, TRUE) = TRUE
        GROUP BY t.id
    """)
    List<Object[]> countMembersByTeam(@Param("clubId") Long clubId,
                                      @Param("semesterId") Long semesterId);

    // ---- Vai trò của current user theo từng team (map teamId -> roleName)
    @Query("""
        SELECT t.id, COALESCE(cr.roleName, 'Thành viên')
        FROM RoleMemberShip rm
        JOIN rm.team t
        LEFT JOIN rm.clubRole cr
        JOIN rm.clubMemberShip cm
        WHERE cm.user.id = :userId
          AND t.club.id = :clubId
          AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
          AND COALESCE(rm.isActive, TRUE) = TRUE
    """)
    List<Object[]> findMyRolesPerTeam(@Param("userId") Long userId,
                                      @Param("clubId") Long clubId,
                                      @Param("semesterId") Long semesterId);

    // ---- User có thuộc team này không? (cho phép xem DETAIL nếu không phải CLUB_PRESIDENT)
    @Query("""
        SELECT CASE WHEN COUNT(rm.id) > 0 THEN TRUE ELSE FALSE END
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        WHERE cm.user.id = :userId
          AND cm.club.id = :clubId
          AND rm.team.id = :teamId
          AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
          AND COALESCE(rm.isActive, TRUE) = TRUE
    """)
    boolean isMyTeam(@Param("userId") Long userId,
                     @Param("clubId") Long clubId,
                     @Param("teamId") Long teamId,
                     @Param("semesterId") Long semesterId);

    // ---- Đếm distinct member của 1 team
    @Query("""
        SELECT COUNT(DISTINCT rm.clubMemberShip.id)
        FROM RoleMemberShip rm
        WHERE rm.team.id = :teamId
          AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
          AND COALESCE(rm.isActive, TRUE) = TRUE
    """)
    Long countDistinctMembers(@Param("teamId") Long teamId,
                              @Param("semesterId") Long semesterId);

    // ---- Các role của user trong 1 team (để gắn vào myRoles ở DETAIL)
    @Query("""
        SELECT DISTINCT COALESCE(cr.roleName, 'Thành viên')
        FROM RoleMemberShip rm
        LEFT JOIN rm.clubRole cr
        JOIN rm.clubMemberShip cm
        WHERE cm.user.id = :userId
          AND rm.team.id = :teamId
          AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
          AND COALESCE(rm.isActive, TRUE) = TRUE
    """)
    List<String> findMyRoles(@Param("userId") Long userId,
                             @Param("teamId") Long teamId,
                             @Param("semesterId") Long semesterId);

    @Query("""
        SELECT CASE WHEN COUNT(rm) > 0 THEN true ELSE false END
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        JOIN rm.clubRole cr
        WHERE cm.user.id = :userId
          AND rm.team.id = :teamId
          AND COALESCE(rm.isActive, TRUE) = TRUE
          AND ( cr.roleCode LIKE %:headSuffix OR cr.roleLevel = 3 )
    """)
    boolean existsTeamLeader(@Param("userId") Long userId,
                             @Param("teamId") Long teamId,
                             @Param("headSuffix") String headSuffix);

    // RoleMemberShipRepository.java
    @Query("""
    SELECT CASE WHEN COUNT(rm) > 0 THEN true ELSE false END
    FROM RoleMemberShip rm
    JOIN rm.clubMemberShip c
    JOIN rm.clubRole cr
    WHERE c.user.id = :userId
      AND c.club.id = :clubId
      AND rm.team IS NULL
      AND COALESCE(rm.isActive, TRUE) = TRUE
      AND cr.roleLevel <= 2
    """)
    boolean existsClubAdmin(@Param("userId") Long userId,
                            @Param("clubId") Long clubId);

    // ---- Lấy danh sách club roles (roleCode) của user trong một club
    @Query("""
        SELECT DISTINCT cr.roleCode
        FROM RoleMemberShip rm
        JOIN rm.clubRole cr
        JOIN rm.clubMemberShip cm
        WHERE cm.user.id = :userId
          AND cm.club.id = :clubId
          AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
          AND COALESCE(rm.isActive, TRUE) = TRUE
    """)
    List<String> findClubRolesByUserAndClub(@Param("userId") Long userId,
                                            @Param("clubId") Long clubId,
                                            @Param("semesterId") Long semesterId);
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

