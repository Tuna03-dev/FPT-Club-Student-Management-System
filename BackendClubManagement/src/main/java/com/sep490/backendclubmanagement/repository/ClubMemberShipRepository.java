package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.MemberDTO;
import com.sep490.backendclubmanagement.dto.response.MyClubDTO;
import com.sep490.backendclubmanagement.entity.ClubMemberShip;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClubMemberShipRepository extends JpaRepository<ClubMemberShip, Long> {

    // CLB mà user đang tham gia trong 1 học kỳ (không phụ thuộc tên collection ở ClubMemberShip)
    @Query("""
        select new com.sep490.backendclubmanagement.dto.response.MyClubDTO(
            c.id, c.clubName, c.logoUrl
        )
        from ClubMemberShip cm
            join cm.club c
        where cm.user.id = :userId
          and exists (
                select 1
                from RoleMemberShip rm
                where rm.clubMemberShip = cm
                  and rm.semester.id = :semesterId
                  and rm.isActive = true
          )
        """)
    List<MyClubDTO> findClubsByUserIdAndSemesterId(@Param("userId") Long userId,
                                                   @Param("semesterId") Long semesterId);

    // Tất cả membership của user (để dùng ở service khác)
    List<ClubMemberShip> findAllByUserId(Long userId);

    // Danh sách thành viên trong 1 CLB (kèm vai trò nếu có trong bảng role_memberships)
    @Query("""
        select new com.sep490.backendclubmanagement.dto.response.MemberDTO(
            u.id,
            u.fullName,
            u.studentCode,
            u.email,
            u.avatarUrl,
            cm.joinDate,
            coalesce(cr.roleName, 'Thành viên')
        )
        from ClubMemberShip cm
            join cm.user u
            left join RoleMemberShip rm
                on rm.clubMemberShip = cm and rm.isActive = true
            left join rm.clubRole cr
        where cm.club.id = :clubId
        """)
    List<MemberDTO> findAllMembersByClubId(@Param("clubId") Long clubId);

    @Query("""
    SELECT DISTINCT cms FROM ClubMemberShip cms 
    LEFT JOIN FETCH cms.roleMemberships rm 
    LEFT JOIN FETCH rm.semester s
    LEFT JOIN FETCH rm.clubRole cr
    WHERE cms.club.id = :clubId 
    AND (:status IS NULL OR cms.status = :status)
    AND (:searchTerm IS NULL OR 
         LOWER(cms.user.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) 
         OR LOWER(cms.user.studentCode) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
""")
    List<ClubMemberShip> findMembersWithFiltersList(
            @Param("clubId") Long clubId,
            @Param("status") ClubMemberShipStatus status,
            @Param("searchTerm") String searchTerm
    );

    @Query("""
    SELECT DISTINCT cms FROM ClubMemberShip cms 
    LEFT JOIN FETCH cms.roleMemberships rm 
    LEFT JOIN FETCH rm.semester s
    LEFT JOIN FETCH rm.clubRole cr
    WHERE cms.club.id = :clubId 
    AND (:searchTerm IS NULL OR 
         LOWER(cms.user.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) 
         OR LOWER(cms.user.studentCode) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
""")
    List<ClubMemberShip> findMembersWithFiltersList(
            @Param("clubId") Long clubId,
            @Param("searchTerm") String searchTerm
    );
    // Kiểm tra xem user đã là thành viên active của club chưa
    boolean existsByUserIdAndClubIdAndStatus(Long userId, Long clubId, ClubMemberShipStatus status);

    // Tìm membership của user trong club với status cụ thể
    java.util.Optional<ClubMemberShip> findByUserIdAndClubIdAndStatus(Long userId, Long clubId, ClubMemberShipStatus status);

    // Kiểm tra xem user có phải là CLUB_PRESIDENT của club trong semester hiện tại không
    @Query("""
        SELECT CASE WHEN COUNT(cm) > 0 THEN true ELSE false END
        FROM ClubMemberShip cm
        JOIN cm.roleMemberships rm
        JOIN rm.clubRole cr
        WHERE cm.user.id = :userId
          AND cm.club.id = :clubId
          AND cm.status = 'ACTIVE'
          AND cr.roleCode = 'CLUB_PRESIDENT'
          AND rm.isActive = true
          AND rm.semester.id = :semesterId
        """)
    boolean isClubPresidentInSemester(@Param("userId") Long userId,
                                      @Param("clubId") Long clubId,
                                      @Param("semesterId") Long semesterId);

    @Query("""
    SELECT cms FROM ClubMemberShip cms
    WHERE cms.club.id = :clubId AND cms.user.id = :userId
    """)
    ClubMemberShip findByClubIdAndUserId(@Param("clubId") Long clubId, @Param("userId") Long userId);
    @Query("SELECT COUNT(cms) > 0 FROM ClubMemberShip cms WHERE cms.club.id = :clubId AND cms.user.id = :userId AND cms.status = 'ACTIVE'")
    boolean existsByClubIdAndUserIdAndStatusActive(@Param("clubId") Long clubId, @Param("userId") Long userId);



    @Query("""
        SELECT cm
        FROM ClubMemberShip cm
        WHERE cm.user.id IN :userIds
          AND cm.club.id = :clubId
          AND cm.status = 'ACTIVE'
    """)
    List<ClubMemberShip> findByUserIdInAndClubId(@Param("userIds") List<Long> userIds,
                                                 @Param("clubId") Long clubId);
}


