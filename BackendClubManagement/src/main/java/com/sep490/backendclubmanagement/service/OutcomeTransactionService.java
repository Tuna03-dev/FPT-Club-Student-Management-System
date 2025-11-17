package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateOutcomeTransactionRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateOutcomeTransactionRequest;
import com.sep490.backendclubmanagement.dto.response.OutcomeTransactionResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.TransactionStatus;
import com.sep490.backendclubmanagement.exception.AppException;
import org.springframework.data.domain.Pageable;

public interface OutcomeTransactionService {

    /**
     * Get all outcome transactions for a club with pagination
     */
    PageResponse<OutcomeTransactionResponse> getOutcomeTransactions(Long clubId, Pageable pageable) throws AppException;

    /**
     * Get outcome transactions by status
     */
    PageResponse<OutcomeTransactionResponse> getOutcomeTransactionsByStatus(
            Long clubId, TransactionStatus status, Pageable pageable) throws AppException;

    /**
     * Get outcome transaction by ID
     */
    OutcomeTransactionResponse getOutcomeTransactionById(Long transactionId) throws AppException;

    /**
     * Create a new outcome transaction
     * - If user has CLUB_OFFICER role: status = SUCCESS (auto-approved)
     * - Otherwise (CLUB_TREASURER or other): status = PENDING (needs approval)
     */
    OutcomeTransactionResponse createOutcomeTransaction(Long clubId, CreateOutcomeTransactionRequest request) throws AppException;

    /**
     * Update outcome transaction (only PENDING status can be updated)
     */
    OutcomeTransactionResponse updateOutcomeTransaction(Long transactionId, UpdateOutcomeTransactionRequest request) throws AppException;

    /**
     * Approve outcome transaction (PENDING -> SUCCESS)
     * This will update the club wallet balance
     */
    OutcomeTransactionResponse approveOutcomeTransaction(Long transactionId) throws AppException;

    /**
     * Reject outcome transaction (PENDING -> CANCELLED)
     */
    OutcomeTransactionResponse rejectOutcomeTransaction(Long transactionId) throws AppException;

    /**
     * Delete outcome transaction (only if PENDING or CANCELLED)
     */
    void deleteOutcomeTransaction(Long transactionId) throws AppException;
}

