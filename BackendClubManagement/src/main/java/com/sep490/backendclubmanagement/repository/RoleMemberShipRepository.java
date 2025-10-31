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

    List<RoleMemberShip> findByClubMemberShipId(Long clubMemberShipId);
    List<RoleMemberShip> findByClubMemberShipIdAndSemesterId(Long clubMemberShipId, Long semesterId);
    Optional<RoleMemberShip> findByClubMemberShipIdAndSemesterIdAndIsActive(Long clubMemberShipId, Long semesterId, Boolean isActive);
    List<RoleMemberShip> findByClubMemberShipIdAndIsActive(Long clubMemberShipId, Boolean isActive);

    // == Club admin (Chủ nhiệm + Phó chủ nhiệm) ==
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

    // == Chủ nhiệm EXACT (reject ở CLB) ==
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

    // == Phó chủ nhiệm EXACT (approve & submit) ==
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

    // == Trưởng ban (lead) thuộc một team bất kỳ trong CLB ==
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


    // == Các query bạn đã có (giữ nguyên) ==
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


}
