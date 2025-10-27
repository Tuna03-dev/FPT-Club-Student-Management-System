package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.RoleMemberShip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleMemberShipRepository extends JpaRepository<RoleMemberShip, Long> {
    List<RoleMemberShip> findByClubMemberShipId(Long clubMemberShipId);
    
    List<RoleMemberShip> findByClubMemberShipIdAndSemesterId(Long clubMemberShipId, Long semesterId);
    
    Optional<RoleMemberShip> findByClubMemberShipIdAndSemesterIdAndIsActive(Long clubMemberShipId, Long semesterId, Boolean isActive);
    
    List<RoleMemberShip> findByClubMemberShipIdAndIsActive(Long clubMemberShipId, Boolean isActive);
}

