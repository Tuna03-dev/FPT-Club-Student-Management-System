package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.CreateOutcomeTransactionRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateOutcomeTransactionRequest;
import com.sep490.backendclubmanagement.dto.response.OutcomeTransactionResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.TransactionStatus;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.service.OutcomeTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for managing Outcome Transactions
 * Handles all operations related to club expense/spending transactions
 */
@RestController
@RequestMapping("/api/clubs/{clubId}/transactions/outcome")
@RequiredArgsConstructor
public class OutcomeTransactionController {

    private final OutcomeTransactionService outcomeTransactionService;

    /**
     * Get all outcome transactions for a club
     * GET /api/clubs/{clubId}/transactions/outcome
     */
    @GetMapping
    public ApiResponse<PageResponse<OutcomeTransactionResponse>> getOutcomeTransactions(
            @PathVariable Long clubId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) TransactionStatus status
    ) throws AppException {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("transactionDate")));

        PageResponse<OutcomeTransactionResponse> response;
        if (status != null) {
            response = outcomeTransactionService.getOutcomeTransactionsByStatus(clubId, status, pageable);
        } else {
            response = outcomeTransactionService.getOutcomeTransactions(clubId, pageable);
        }

        return ApiResponse.success(response);
    }

    /**
     * Get outcome transaction by ID
     * GET /api/clubs/{clubId}/transactions/outcome/{transactionId}
     */
    @GetMapping("/{transactionId}")
    public ApiResponse<OutcomeTransactionResponse> getOutcomeTransactionById(
            @PathVariable Long clubId,
            @PathVariable Long transactionId
    ) throws AppException {
        OutcomeTransactionResponse response = outcomeTransactionService.getOutcomeTransactionById(transactionId);
        return ApiResponse.success(response);
    }

    /**
     * Create a new outcome transaction
     * POST /api/clubs/{clubId}/transactions/outcome
     */
    @PostMapping
    public ApiResponse<OutcomeTransactionResponse> createOutcomeTransaction(
            @PathVariable Long clubId,
            @Valid @RequestBody CreateOutcomeTransactionRequest request
    ) throws AppException {
        OutcomeTransactionResponse response = outcomeTransactionService.createOutcomeTransaction(clubId, request);
        return ApiResponse.success(response);
    }

    /**
     * Update outcome transaction (only PENDING status can be updated)
     * PUT /api/clubs/{clubId}/transactions/outcome/{transactionId}
     */
    @PutMapping("/{transactionId}")
    public ApiResponse<OutcomeTransactionResponse> updateOutcomeTransaction(
            @PathVariable Long clubId,
            @PathVariable Long transactionId,
            @Valid @RequestBody UpdateOutcomeTransactionRequest request
    ) throws AppException {
        OutcomeTransactionResponse response = outcomeTransactionService.updateOutcomeTransaction(transactionId, request);
        return ApiResponse.success(response);
    }

    /**
     * Approve outcome transaction (PENDING -> SUCCESS)
     * POST /api/clubs/{clubId}/transactions/outcome/{transactionId}/approve
     */
    @PostMapping("/{transactionId}/approve")
    public ApiResponse<OutcomeTransactionResponse> approveOutcomeTransaction(
            @PathVariable Long clubId,
            @PathVariable Long transactionId
    ) throws AppException {
        OutcomeTransactionResponse response = outcomeTransactionService.approveOutcomeTransaction(transactionId);
        return ApiResponse.success(response);
    }

    /**
     * Reject outcome transaction (PENDING -> CANCELLED)
     * POST /api/clubs/{clubId}/transactions/outcome/{transactionId}/reject
     */
    @PostMapping("/{transactionId}/reject")
    public ApiResponse<OutcomeTransactionResponse> rejectOutcomeTransaction(
            @PathVariable Long clubId,
            @PathVariable Long transactionId
    ) throws AppException {
        OutcomeTransactionResponse response = outcomeTransactionService.rejectOutcomeTransaction(transactionId);
        return ApiResponse.success(response);
    }

    /**
     * Delete outcome transaction
     * DELETE /api/clubs/{clubId}/transactions/outcome/{transactionId}
     */
    @DeleteMapping("/{transactionId}")
    public ApiResponse<Void> deleteOutcomeTransaction(
            @PathVariable Long clubId,
            @PathVariable Long transactionId
    ) throws AppException {
        outcomeTransactionService.deleteOutcomeTransaction(transactionId);
        return ApiResponse.success();
    }
}

