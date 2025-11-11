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

    /* ====== BỔ SUNG (từ nhánh bạn): đếm member active trong kỳ hiện tại của 1 CLB ====== */
    @Query("""
        SELECT COUNT(DISTINCT rm.clubMemberShip.id)
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        JOIN rm.semester s
        WHERE cm.club.id = :clubId
          AND COALESCE(rm.isActive, TRUE) = TRUE
          AND s.isCurrent = TRUE
    """)
    Long countActiveMembersInCurrentSemester(@Param("clubId") Long clubId);

    /* ====== SYSTEM ROLE ====== */
    @Query(value = "SELECT sr.role_name\n" +
            "FROM users u\n" +
            "         JOIN club_memberships cm ON u.id = cm.user_id\n" +
            "         JOIN role_memberships rm ON cm.id = rm.club_membership_id\n" +
            "         JOIN semesters s ON rm.semester_id = s.id\n" +
            "         JOIN club_roles cr ON rm.clubrole_id = cr.id\n" +
            "         JOIN system_roles sr ON cr.system_role_id = sr.id\n" +
            "WHERE u.id = :userId\n" +
            "  AND s.is_current = true\n" +
            "LIMIT 1",
            nativeQuery = true)
    Optional<String> findSystemRoleByUserId(@Param("userId") Long userId);

    @Query(value = "SELECT sr.role_name\n" +
            "FROM users u\n" +
            "         JOIN club_memberships cm ON u.id = cm.user_id\n" +
            "         JOIN role_memberships rm ON cm.id = rm.club_membership_id\n" +
            "         JOIN semesters s ON rm.semester_id = s.id\n" +
            "         JOIN club_roles cr ON rm.clubrole_id = cr.id\n" +
            "         JOIN system_roles sr ON cr.system_role_id = sr.id\n" +
            "WHERE u.id = :userId\n" +
            "  AND cm.club_id = :clubId\n" +
            "  AND s.is_current = true\n" +
            "LIMIT 1",
            nativeQuery = true)
    Optional<String> findSystemRoleByUserIdAndClubId(@Param("userId") Long userId,
                                                     @Param("clubId") Long clubId);

    @Query(value = "SELECT sr.role_name FROM users u " +
            "JOIN system_roles sr ON u.system_role_id = sr.id " +
            "WHERE u.id = :userId",
            nativeQuery = true)
    Optional<String> findSystemRoleStaff(Long userId);

    /* ====== BASIC FINDERS ====== */
    List<RoleMemberShip> findByClubMemberShipId(Long clubMemberShipId);

    List<RoleMemberShip> findByClubMemberShipIdAndSemesterId(Long clubMemberShipId, Long semesterId);

    // giữ phiên bản develop để tránh vỡ service đang dùng
    Optional<RoleMemberShip> findByClubMemberShipIdAndSemesterIdAndIsActive(Long clubMemberShipId, Long semesterId, Boolean isActive);

    // bản fetch join của bạn (giữ nguyên tên để không đụng develop)
    @Query("""
        SELECT rm FROM RoleMemberShip rm
        LEFT JOIN FETCH rm.team t
        LEFT JOIN FETCH rm.clubRole cr
        LEFT JOIN FETCH cr.systemRole sr
        WHERE rm.clubMemberShip.id = :clubMemberShipId
          AND rm.semester.id = :semesterId
          AND rm.isActive = :isActive
    """)
    List<RoleMemberShip> findByClubMemberShipIdAndSemesterIdAndIsActiveWithFetch(
            @Param("clubMemberShipId") Long clubMemberShipId,
            @Param("semesterId") Long semesterId,
            @Param("isActive") Boolean isActive);

    List<RoleMemberShip> findByClubMemberShipIdAndIsActive(Long clubMemberShipId, Boolean isActive);

    /* ====== CLUB ADMIN / PRESIDENT / VICE ====== */
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
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM RoleMemberShip rm
      JOIN rm.clubMemberShip cm
      LEFT JOIN rm.clubRole cr
      WHERE cm.user.id = :userId
        AND cm.club.id = :clubId
        AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
        AND COALESCE(rm.isActive, TRUE) = TRUE
        AND rm.team IS NULL
        AND UPPER(TRIM(COALESCE(cr.roleName, ''))) IN (
          'CLUB_PRESIDENT','PRESIDENT','CHU NHIEM','CHỦ NHIỆM'
        )
    ) THEN TRUE ELSE FALSE END
    """)
    boolean isClubPresidentExact(@Param("userId") Long userId,
                                 @Param("clubId") Long clubId,
                                 @Param("semesterId") Long semesterId);

    @Query("""
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM RoleMemberShip rm
      JOIN rm.clubMemberShip cm
      LEFT JOIN rm.clubRole cr
      WHERE cm.user.id = :userId
        AND cm.club.id = :clubId
        AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
        AND COALESCE(rm.isActive, TRUE) = TRUE
        AND rm.team IS NULL
        AND UPPER(TRIM(COALESCE(cr.roleName, ''))) IN (
          'VICE_PRESIDENT','CLUB_VP','PHO CHU NHIEM','PHÓ CHỦ NHIỆM'
        )
    ) THEN TRUE ELSE FALSE END
    """)
    boolean isClubViceExact(@Param("userId") Long userId,
                            @Param("clubId") Long clubId,
                            @Param("semesterId") Long semesterId);

    /* ====== TEAM LEAD (ANY TEAM IN CLUB) ====== */
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
    AND rm.team IS NOT NULL
    AND (
         UPPER(TRIM(COALESCE(cr.roleName, ''))) IN ('CLUB_OFFICER','OFFICER','TEAM_LEAD','LEAD','HEAD')
      OR UPPER(TRIM(COALESCE(cr.roleCode, '')))     IN ('TEAM_LEAD','LEAD','HEAD')
      OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%TRUONG BAN%'
      OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%TRƯỞNG BAN%'
      OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%LEAD%'
      OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%HEAD%'
    )
) THEN TRUE ELSE FALSE END
""")
    boolean isAnyTeamLeadInClub(@Param("userId") Long userId,
                                @Param("clubId") Long clubId,
                                @Param("semesterId") Long semesterId);

    /* ====== LISTING / COUNTS ====== */
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

    @Query("""
        SELECT COUNT(DISTINCT rm.clubMemberShip.id)
        FROM RoleMemberShip rm
        WHERE rm.team.id = :teamId
          AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
          AND COALESCE(rm.isActive, TRUE) = TRUE
    """)
    Long countDistinctMembers(@Param("teamId") Long teamId,
                              @Param("semesterId") Long semesterId);

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
SELECT CASE WHEN EXISTS (
  SELECT 1
  FROM RoleMemberShip rm
  JOIN rm.clubMemberShip cm
  LEFT JOIN rm.clubRole cr
  WHERE cm.user.id = :userId
    AND cm.club.id = :clubId
    AND rm.team.id = :teamId
    AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
    AND COALESCE(rm.isActive, TRUE) = TRUE
    AND (
         UPPER(TRIM(COALESCE(cr.roleName, ''))) IN ('CLUB_OFFICER','OFFICER','TEAM_LEAD','LEAD','HEAD')
      OR UPPER(TRIM(COALESCE(cr.roleCode, '')))     IN ('TEAM_LEAD','LEAD','HEAD')
      OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%TRUONG BAN%'
      OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%TRƯỞNG BAN%'
      OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%LEAD%'
      OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%HEAD%'
    )
) THEN TRUE ELSE FALSE END
""")
    boolean isTeamLeadExact(@Param("userId") Long userId,
                            @Param("clubId") Long clubId,
                            @Param("teamId") Long teamId,
                            @Param("semesterId") Long semesterId);

    @Query("""
    SELECT DISTINCT rm.team.id
    FROM RoleMemberShip rm
    JOIN rm.clubMemberShip cm
    LEFT JOIN rm.clubRole cr
    WHERE cm.user.id = :userId
      AND cm.club.id = :clubId
      AND COALESCE(rm.isActive, TRUE) = TRUE
      AND rm.team IS NOT NULL
      AND (
            UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%LEAD%'
         OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%HEAD%'
         OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%TRUONG BAN%'
         OR UPPER(TRIM(COALESCE(cr.roleName, ''))) LIKE '%TRƯỞNG BAN%'
      )
""")
    List<Long> findLeadTeamIdsInClub(@Param("userId") Long userId, @Param("clubId") Long clubId);

    /* ====== TEAM LEADER EXISTS ====== */
    // Giữ bản develop (roleLevel = 3)
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

    // Bản logic theo kỳ hiện tại của bạn (đặt tên khác để không đụng)
    @Query("""
        SELECT CASE WHEN COUNT(rm) > 0 THEN true ELSE false END
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        JOIN rm.clubRole cr
        JOIN rm.semester s
        WHERE cm.user.id = :userId
          AND rm.team.id = :teamId
          AND COALESCE(rm.isActive, TRUE) = TRUE
          AND ( cr.roleCode LIKE %:headSuffix OR cr.roleLevel <= 3 )
          AND s.isCurrent = true
    """)
    boolean existsTeamLeaderCurrentSemester(@Param("userId") Long userId,
                                            @Param("teamId") Long teamId,
                                            @Param("headSuffix") String headSuffix);

    /* ====== CLUB ADMIN EXIST ====== */
    @Query("""
SELECT CASE WHEN COUNT(rm) > 0 THEN true ELSE false END
FROM RoleMemberShip rm
JOIN rm.clubMemberShip c
JOIN rm.clubRole cr
JOIN rm.semester s
WHERE c.user.id = :userId
  AND c.club.id = :clubId
  AND rm.team IS NULL
  AND COALESCE(rm.isActive, TRUE) = TRUE
  AND cr.roleLevel <= 2
  AND s.isCurrent = true
""")
    boolean existsClubAdmin(@Param("userId") Long userId,
                            @Param("clubId") Long clubId);

    /* ====== ROLE CODES BY USER IN CLUB ====== */
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

    /* ====== PRESIDENT/OFFICER CHECKS (cross clubs) ====== */
    @Query("""
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        LEFT JOIN rm.clubRole cr
        JOIN rm.semester s
        WHERE cm.user.id = :userId
          AND s.isCurrent = TRUE
          AND COALESCE(rm.isActive, TRUE) = TRUE
          AND rm.team IS NULL
          AND UPPER(TRIM(COALESCE(cr.roleName, ''))) IN (
              'CLUB_PRESIDENT','PRESIDENT',
              'CHỦ NHIỆM','CHU NHIEM'
          )
    ) THEN TRUE ELSE FALSE END
    """)
    boolean existsPresidentSomewhere(@Param("userId") Long userId);

    @Query("""
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        LEFT JOIN rm.clubRole cr
        WHERE cm.user.id = :userId
          AND cm.club.id = :clubId
          AND COALESCE(rm.isActive, TRUE) = TRUE
          AND rm.team IS NULL
          AND UPPER(TRIM(COALESCE(cr.roleName, ''))) IN (
              'CLUB_OFFICER','OFFICER',
              'CÁN BỘ','CAN BO'
          )
    ) THEN TRUE ELSE FALSE END
    """)
    boolean isClubOfficer(@Param("userId") Long userId,
                          @Param("clubId") Long clubId);

    @Query("""
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        LEFT JOIN rm.clubRole cr
        JOIN rm.semester s
        WHERE cm.user.id = :userId
          AND s.isCurrent = TRUE
          AND COALESCE(rm.isActive, TRUE) = TRUE
          AND rm.team IS NULL
          AND UPPER(TRIM(COALESCE(cr.roleName, ''))) IN (
              'CLUB_OFFICER','OFFICER',
              'CÁN BỘ','CAN BO'
          )
    ) THEN TRUE ELSE FALSE END
    """)
    boolean existsOfficerSomewhere(@Param("userId") Long userId);

    /* ====== RAW / UTILS ====== */
    @Query(value = "SELECT rm.* FROM role_memberships rm " +
            "JOIN club_memberships cms ON rm.club_membership_id = cms.id " +
            "WHERE cms.user_id = :userId AND cms.club_id = :clubId " +
            "AND rm.is_active = true",
            nativeQuery = true)
    List<RoleMemberShip> findActiveRoleMemberships(
            @Param("userId") Long userId,
            @Param("clubId") Long clubId
    );

    @Query(value = "SELECT DISTINCT cms.club_id FROM club_memberships cms " +
            "JOIN users u ON cms.user_id = u.id " +
            "JOIN system_roles sr ON u.system_role_id = sr.id " +
            "WHERE cms.user_id = :userId AND sr.role_name = 'CLUB_PRESIDENT'",
            nativeQuery = true)
    List<Long> findPresidentClubIdsByUserId(@Param("userId") Long userId);

    /* ====== CREATE TEAM (helpers) ====== */
    @Query(value = """
        SELECT DISTINCT cm.user_id
        FROM role_memberships rm
        JOIN club_memberships cm ON rm.club_membership_id = cm.id
        WHERE cm.club_id = :clubId
          AND rm.semester_id = :semesterId
          AND rm.is_active = TRUE
          AND rm.team_id IS NOT NULL
          AND cm.user_id IN (:userIds)
        """, nativeQuery = true)
    List<Long> findExistingTeamMembersInSemester(
            @Param("clubId") Long clubId,
            @Param("semesterId") Long semesterId,
            @Param("userIds") List<Long> userIds
    );

    @Query("""
SELECT cm.user.id
FROM ClubMemberShip cm
WHERE cm.club.id = :clubId
  AND cm.status = com.sep490.backendclubmanagement.entity.ClubMemberShipStatus.ACTIVE
  AND NOT EXISTS (
       SELECT 1
       FROM RoleMemberShip rmTeam
       WHERE rmTeam.clubMemberShip = cm
         AND rmTeam.semester.id = :semesterId
         AND COALESCE(rmTeam.isActive, TRUE) = TRUE
         AND rmTeam.team IS NOT NULL
  )
  AND NOT EXISTS (
       SELECT 1
       FROM RoleMemberShip rmClub
       JOIN rmClub.clubRole cr
       WHERE rmClub.clubMemberShip = cm
         AND rmClub.semester.id = :semesterId
         AND COALESCE(rmClub.isActive, TRUE) = TRUE
         AND rmClub.team IS NULL
         AND UPPER(cr.roleCode) IN ('CLUB_PRESIDENT','CLUB_VICE_PRESIDENT')
  )
""")
    List<Long> findAvailableMemberUserIds(@Param("clubId") Long clubId,
                                          @Param("semesterId") Long semesterId);

    /* ====== MY CLUB ROLE NAMES (no team) ====== */
    @Query("""
    SELECT DISTINCT COALESCE(cr.roleName, 'Thành viên')
    FROM RoleMemberShip rm
    LEFT JOIN rm.clubRole cr
    JOIN rm.clubMemberShip cm
    WHERE cm.user.id = :userId
      AND cm.club.id = :clubId
      AND rm.team IS NULL
      AND (:semesterId IS NULL OR rm.semester.id = :semesterId)
      AND COALESCE(rm.isActive, TRUE) = TRUE
""")
    List<String> findMyClubRoleNames(@Param("userId") Long userId,
                                     @Param("clubId") Long clubId,
                                     @Param("semesterId") Long semesterId);

    /* ====== CHECK OFFICER (theo logic develop) ====== */
    @Query("""
        SELECT CASE WHEN COUNT(rm) > 0 THEN true ELSE false END
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        JOIN cm.user u
        JOIN cm.club c
        JOIN rm.clubRole cr
        LEFT JOIN rm.semester s
        WHERE u.id = :userId
          AND c.id = :clubId
          AND rm.isActive = true
          AND rm.team IS NULL
          AND (
                rm.semester IS NULL
             OR (s.startDate <= CURRENT_DATE AND s.endDate >= CURRENT_DATE)
          )
          AND cr.roleCode IN ('CLUB_PRESIDENT','CLUB_VICE_PRESIDENT')
    """)
    boolean isUserClubOfficer(@Param("userId") Long userId, @Param("clubId") Long clubId);

    /* ====== BỔ SUNG (từ nhánh bạn): check PRESIDENT/OFFICER theo kỳ hiện tại cụ thể ====== */
    @Query("""
        SELECT CASE WHEN COUNT(rm) > 0 THEN true ELSE false END
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        JOIN rm.clubRole cr
        WHERE cm.user.id = :userId
          AND cm.club.id = :clubId
          AND cm.status = 'ACTIVE'
          AND rm.semester.id = :semesterId
          AND COALESCE(rm.isActive, TRUE) = TRUE
          AND UPPER(TRIM(cr.roleCode)) = 'CLUB_PRESIDENT'
    """)
    boolean isClubPresidentInCurrentSemester(@Param("userId") Long userId,
                                             @Param("clubId") Long clubId,
                                             @Param("semesterId") Long semesterId);

    @Query("""
        SELECT CASE WHEN COUNT(rm) > 0 THEN true ELSE false END
        FROM RoleMemberShip rm
        JOIN rm.clubMemberShip cm
        JOIN rm.clubRole cr
        LEFT JOIN cr.systemRole sr
        WHERE cm.user.id = :userId
          AND cm.club.id = :clubId
          AND rm.semester.id = :semesterId
          AND COALESCE(rm.isActive, TRUE) = TRUE
          AND cr IS NOT NULL
          AND (
              UPPER(TRIM(cr.roleCode)) IN ('CLUB_OFFICER', 'TEAM_OFFICER')
              OR (sr IS NOT NULL AND UPPER(TRIM(sr.roleName)) IN ('CLUB_OFFICER', 'TEAM_OFFICER'))
          )
    """)
    boolean isClubOfficerOrTeamOfficerInCurrentSemester(@Param("userId") Long userId,
                                                        @Param("clubId") Long clubId,
                                                        @Param("semesterId") Long semesterId);
}
