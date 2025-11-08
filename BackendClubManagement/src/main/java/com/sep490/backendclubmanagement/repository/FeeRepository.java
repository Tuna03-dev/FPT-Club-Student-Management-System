package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {
    List<Fee> findByClub_Id(Long club_id);
    boolean existsByTitleIgnoreCaseAndClub_Id(String title, Long clubId);
    boolean existsByTitleIgnoreCaseAndClub_IdAndIdNot(String title, Long clubId, Long excludeId);

    /**
     * Find all unpaid fees for user (not having IncomeTransaction)
     */
    @Query("SELECT f FROM Fee f WHERE f.club.id = :clubId AND NOT EXISTS (SELECT it FROM IncomeTransaction it WHERE it.fee = f AND it.user.id = :userId)")
    List<Fee> findUnpaidFeesByClubIdAndUserId(@Param("clubId") Long clubId, @Param("userId") Long userId);

    @Query("SELECT f FROM Fee f " +
            "JOIN f.incomeTransactions it " +
            "WHERE f.club.id = :clubId " +
            "AND it.user.id = :userId " +
            "AND it.status = 'SUCCESS' " +
            "GROUP BY f.id " +
            "ORDER BY MAX(it.transactionDate) DESC")
    List<Fee> findPaidFeesByClubIdAndUserId(@Param("clubId") Long clubId,
                                            @Param("userId") Long userId);
}

