package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.entity.ClubWallet;
import com.sep490.backendclubmanagement.entity.IncomeTransaction;
import com.sep490.backendclubmanagement.entity.OutcomeTransaction;
import com.sep490.backendclubmanagement.entity.TransactionStatus;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.repository.ClubWalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Service to handle ClubWallet balance updates
 * Since TiDB doesn't support triggers, all wallet update logic is in application layer
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ClubWalletService {

    private final ClubWalletRepository clubWalletRepository;

    /**
     * Process income transaction and update wallet if status = SUCCESS
     * Call this after saving IncomeTransaction
     */
    @Transactional
    public void processIncomeTransaction(IncomeTransaction transaction, IncomeTransaction oldTransaction) {
        if (transaction.getDeletedAt() != null) {
            // Soft deleted - skip processing
            return;
        }

        ClubWallet wallet = transaction.getClubWallet();
        TransactionStatus oldStatus = oldTransaction != null ? oldTransaction.getStatus() : null;
        TransactionStatus newStatus = transaction.getStatus();
        BigDecimal oldAmount = oldTransaction != null ? oldTransaction.getAmount() : BigDecimal.ZERO;
        BigDecimal newAmount = transaction.getAmount();

        // Case 1: Non-SUCCESS to SUCCESS (add amount)
        if (oldStatus != TransactionStatus.SUCCESS && newStatus == TransactionStatus.SUCCESS) {
            wallet.setBalance(wallet.getBalance().add(newAmount));
            wallet.setTotalIncome(wallet.getTotalIncome().add(newAmount));
            clubWalletRepository.save(wallet);
            log.info("Income transaction SUCCESS: Added {} to wallet {}", newAmount, wallet.getId());
        }
        // Case 2: SUCCESS to non-SUCCESS (subtract amount - reverse)
        else if (oldStatus == TransactionStatus.SUCCESS && newStatus != TransactionStatus.SUCCESS) {
            wallet.setBalance(wallet.getBalance().subtract(oldAmount));
            wallet.setTotalIncome(wallet.getTotalIncome().subtract(oldAmount));
            clubWalletRepository.save(wallet);
            log.info("Income transaction reversed: Subtracted {} from wallet {}", oldAmount, wallet.getId());
        }
        // Case 3: Both SUCCESS but amount changed
        else if (oldStatus == TransactionStatus.SUCCESS && newStatus == TransactionStatus.SUCCESS
                && oldAmount.compareTo(newAmount) != 0) {
            wallet.setBalance(wallet.getBalance().subtract(oldAmount).add(newAmount));
            wallet.setTotalIncome(wallet.getTotalIncome().subtract(oldAmount).add(newAmount));
            clubWalletRepository.save(wallet);
            log.info("Income transaction amount changed: {} -> {} for wallet {}", oldAmount, newAmount, wallet.getId());
        }
    }

    /**
     * Process outcome transaction and update wallet if status = SUCCESS
     * Call this after saving OutcomeTransaction
     * Throws exception if insufficient balance
     */
    @Transactional
    public void processOutcomeTransaction(OutcomeTransaction transaction, OutcomeTransaction oldTransaction) throws AppException {
        if (transaction.getDeletedAt() != null) {
            // Soft deleted - skip processing
            return;
        }

        ClubWallet wallet = transaction.getClubWallet();
        TransactionStatus oldStatus = oldTransaction != null ? oldTransaction.getStatus() : null;
        TransactionStatus newStatus = transaction.getStatus();
        BigDecimal oldAmount = oldTransaction != null ? oldTransaction.getAmount() : BigDecimal.ZERO;
        BigDecimal newAmount = transaction.getAmount();

        // Case 1: Non-SUCCESS to SUCCESS (subtract amount)
        if (oldStatus != TransactionStatus.SUCCESS && newStatus == TransactionStatus.SUCCESS) {
            // Check sufficient balance
            if (wallet.getBalance().compareTo(newAmount) < 0) {
                throw new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);
            }
            wallet.setBalance(wallet.getBalance().subtract(newAmount));
            wallet.setTotalOutcome(wallet.getTotalOutcome().add(newAmount));
            clubWalletRepository.save(wallet);
            log.info("Outcome transaction SUCCESS: Subtracted {} from wallet {}", newAmount, wallet.getId());
        }
        // Case 2: SUCCESS to non-SUCCESS (add back amount - reverse)
        else if (oldStatus == TransactionStatus.SUCCESS && newStatus != TransactionStatus.SUCCESS) {
            wallet.setBalance(wallet.getBalance().add(oldAmount));
            wallet.setTotalOutcome(wallet.getTotalOutcome().subtract(oldAmount));
            clubWalletRepository.save(wallet);
            log.info("Outcome transaction reversed: Added back {} to wallet {}", oldAmount, wallet.getId());
        }
        // Case 3: Both SUCCESS but amount changed
        else if (oldStatus == TransactionStatus.SUCCESS && newStatus == TransactionStatus.SUCCESS
                && oldAmount.compareTo(newAmount) != 0) {
            // Check sufficient balance for new amount
            BigDecimal balanceAfterReverse = wallet.getBalance().add(oldAmount);
            if (balanceAfterReverse.compareTo(newAmount) < 0) {
                throw new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);
            }
            wallet.setBalance(balanceAfterReverse.subtract(newAmount));
            wallet.setTotalOutcome(wallet.getTotalOutcome().subtract(oldAmount).add(newAmount));
            clubWalletRepository.save(wallet);
            log.info("Outcome transaction amount changed: {} -> {} for wallet {}", oldAmount, newAmount, wallet.getId());
        }
    }

    /**
     * Handle soft delete of income transaction
     * Reverse the wallet update if transaction was SUCCESS
     */
    @Transactional
    public void softDeleteIncomeTransaction(IncomeTransaction transaction) {
        if (transaction.getStatus() == TransactionStatus.SUCCESS && transaction.getDeletedAt() == null) {
            ClubWallet wallet = transaction.getClubWallet();
            wallet.setBalance(wallet.getBalance().subtract(transaction.getAmount()));
            wallet.setTotalIncome(wallet.getTotalIncome().subtract(transaction.getAmount()));
            clubWalletRepository.save(wallet);
            log.info("Income transaction soft deleted: Reversed {} from wallet {}", transaction.getAmount(), wallet.getId());
        }
    }

    /**
     * Handle soft delete of outcome transaction
     * Reverse the wallet update if transaction was SUCCESS
     */
    @Transactional
    public void softDeleteOutcomeTransaction(OutcomeTransaction transaction) {
        if (transaction.getStatus() == TransactionStatus.SUCCESS && transaction.getDeletedAt() == null) {
            ClubWallet wallet = transaction.getClubWallet();
            wallet.setBalance(wallet.getBalance().add(transaction.getAmount()));
            wallet.setTotalOutcome(wallet.getTotalOutcome().subtract(transaction.getAmount()));
            clubWalletRepository.save(wallet);
            log.info("Outcome transaction soft deleted: Reversed {} to wallet {}", transaction.getAmount(), wallet.getId());
        }
    }

    /**
     * Recalculate wallet balance from all SUCCESS transactions
     * Use this for data consistency check/fix
     * This method will be called by scheduled job to ensure balance accuracy
     */
    @Transactional
    public void recalculateWalletBalance(Long walletId) {
        ClubWallet wallet = clubWalletRepository.findById(walletId)
                .orElseThrow(() -> new RuntimeException("Wallet not found: " + walletId));

        log.info("Recalculating wallet balance for wallet {}", walletId);

        // Note: Actual recalculation is done by WalletBalanceConsistencyCheckJob
        // which runs daily at 2:00 AM using direct SQL queries for better performance
        // This method is kept for future manual trigger if needed
    }
}

