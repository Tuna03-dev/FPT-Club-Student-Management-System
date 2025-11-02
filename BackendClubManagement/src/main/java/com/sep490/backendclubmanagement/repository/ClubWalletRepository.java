package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.ClubWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClubWalletRepository extends JpaRepository<ClubWallet, Long> {
    Optional<ClubWallet> findByClub_Id(Long clubId);
}



