package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.Fee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {
    List<Fee> findByClub_IdAndIsDraftFalse(Long club_id);
    List<Fee> findByClub_IdAndIsDraftTrue(Long club_id);
    boolean existsByTitleIgnoreCaseAndClub_IdAndIsDraftFalse(String title, Long clubId);
    boolean existsByTitleIgnoreCaseAndClub_IdAndIsDraftFalseAndIdNot(String title, Long clubId, Long excludeId);

    Page<Fee> findByClub_Id(Long clubId, Pageable pageable);

    /**
     * Find all unpaid fees for user (not having IncomeTransaction)
     */
    @Query("SELECT f FROM Fee f WHERE f.club.id = :clubId AND f.isDraft = false AND f.dueDate >= CURRENT_DATE AND NOT EXISTS (SELECT it FROM IncomeTransaction it WHERE it.fee = f AND it.user.id = :userId)")
    List<Fee> findUnpaidFeesByClubIdAndUserId(@Param("clubId") Long clubId, @Param("userId") Long userId);

    @Query("SELECT f FROM Fee f " +
            "JOIN f.incomeTransactions it " +
            "WHERE f.club.id = :clubId " +
            "AND f.isDraft = false " +
            "AND it.user.id = :userId " +
            "AND it.status = 'SUCCESS' " +
            "GROUP BY f.id " +
            "ORDER BY MAX(it.transactionDate) DESC")
    List<Fee> findPaidFeesByClubIdAndUserId(@Param("clubId") Long clubId,
                                            @Param("userId") Long userId);

    @Query(value = "SELECT f.* FROM fees f " +
            "INNER JOIN income_transactions it ON it.fee_id = f.id " +
            "WHERE f.club_id = :clubId " +
            "AND f.is_draft = false " +
            "AND it.user_id = :userId " +
            "AND it.status = 'SUCCESS' " +
            "GROUP BY f.id " +
            "ORDER BY MAX(it.transaction_date) DESC",
            countQuery = "SELECT COUNT(DISTINCT f.id) FROM fees f " +
                    "INNER JOIN income_transactions it ON it.fee_id = f.id " +
                    "WHERE f.club_id = :clubId " +
                    "AND f.is_draft = false " +
                    "AND it.user_id = :userId " +
                    "AND it.status = 'SUCCESS'",
            nativeQuery = true)
    Page<Fee> findPaidFeesByClubIdAndUserId(@Param("clubId") Long clubId,
                                            @Param("userId") Long userId,
                                            Pageable pageable);
}

