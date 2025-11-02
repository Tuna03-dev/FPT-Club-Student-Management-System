package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.entity.IncomeTransaction;
import com.sep490.backendclubmanagement.entity.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IncomeTransactionRepository extends JpaRepository<IncomeTransaction, Long> {
    
    /**
     * Find income transaction by reference (transaction code)
     */
    Optional<IncomeTransaction> findByReference(String reference);
    
    /**
     * Check if reference already exists
     */
    boolean existsByReference(String reference);
    boolean existsByUser_IdAndFee_IdAndStatus(Long userId, Long feeId, TransactionStatus status);
}

