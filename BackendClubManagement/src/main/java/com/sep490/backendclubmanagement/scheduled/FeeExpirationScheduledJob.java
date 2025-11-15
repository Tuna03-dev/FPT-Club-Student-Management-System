package com.sep490.backendclubmanagement.scheduled;

import com.sep490.backendclubmanagement.entity.Fee;
import com.sep490.backendclubmanagement.repository.FeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Scheduled job to mark fees as expired when their due date passes
 * Once a fee is marked as expired (hasEverExpired = true), the amount can never be edited again
 * This prevents scenarios where:
 * 1. A fee expires
 * 2. Admin updates the due date to make it "active" again
 * 3. Admin tries to change the amount (this should be blocked)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FeeExpirationScheduledJob {

    /**
     * Run once when application starts to mark any expired fees
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void onApplicationReady() {
        log.info("Application ready - running initial fee expiration check");
        performFeeExpirationCheck();
    }

    private final FeeRepository feeRepository;

    /**
     * Check and mark expired fees every day at 00:05 AM
     * Cron expression: "0 5 0 * * *" means:
     * - second: 0
     * - minute: 5
     * - hour: 0 (midnight)
     * - day of month: * (every day)
     * - month: * (every month)
     * - day of week: * (every day of week)
     */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void markExpiredFees() {
        performFeeExpirationCheck();
    }

    /**
     * Core logic to check and mark expired fees
     */
    private void performFeeExpirationCheck() {
        log.info("Starting scheduled job: Mark Expired Fees");

        try {
            LocalDate today = LocalDate.now();
            log.info("Checking for expired fees on date: {}", today);

            // Find all fees that have expired but not yet marked as hasEverExpired
            // Only check published fees (isDraft = false)
            List<Fee> expiredFees = feeRepository.findByDueDateBeforeAndHasEverExpiredFalseAndIsDraftFalse(today);

            if (expiredFees.isEmpty()) {
                log.info("No fees to mark as expired");
                return;
            }

            log.info("Found {} fees that have expired and need to be marked", expiredFees.size());

            int markedCount = 0;
            for (Fee fee : expiredFees) {
                log.debug("Marking fee as ever expired: ID={}, Title='{}', DueDate={}",
                        fee.getId(), fee.getTitle(), fee.getDueDate());

                fee.setHasEverExpired(true);
                markedCount++;
            }

            // Save all changes
            feeRepository.saveAll(expiredFees);

            log.info("Successfully marked {} fees as ever expired", markedCount);

        } catch (Exception e) {
            log.error("Error occurred while marking expired fees: {}", e.getMessage(), e);
            throw e; // Re-throw to trigger transaction rollback
        }

        log.info("Completed scheduled job: Mark Expired Fees");
    }
}

