package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.MemberDTO;
import com.sep490.backendclubmanagement.dto.response.MyClubDTO;
import com.sep490.backendclubmanagement.entity.ClubMemberShip;
import com.sep490.backendclubmanagement.entity.RoleMemberShip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClubMembershipRepository extends JpaRepository<ClubMemberShip, Long> {

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
}
