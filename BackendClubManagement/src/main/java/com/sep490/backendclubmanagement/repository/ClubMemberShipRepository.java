package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.MemberDTO;
import com.sep490.backendclubmanagement.dto.response.MyClubDTO;
import com.sep490.backendclubmanagement.entity.ClubMemberShip;
import com.sep490.backendclubmanagement.entity.ClubMemberShipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

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

}
