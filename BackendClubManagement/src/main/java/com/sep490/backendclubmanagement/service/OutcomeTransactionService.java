package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateOutcomeTransactionRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateOutcomeTransactionRequest;
import com.sep490.backendclubmanagement.dto.response.OutcomeTransactionResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.OutcomeTransactionMapper;
import com.sep490.backendclubmanagement.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutcomeTransactionService {

    private final OutcomeTransactionRepository outcomeTransactionRepository;
    private final ClubWalletRepository clubWalletRepository;
    private final UserRepository userRepository;
    private final OutcomeTransactionMapper outcomeTransactionMapper;
    private final UserService userService;

    /**
     * Get all outcome transactions for a club with pagination
     */
    public PageResponse<OutcomeTransactionResponse> getOutcomeTransactions(Long clubId, Pageable pageable) throws AppException {
        ClubWallet clubWallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_WALLET_NOT_FOUND));

        Page<OutcomeTransaction> page = outcomeTransactionRepository.findByClubWalletId(clubWallet.getId(), pageable);

        List<OutcomeTransactionResponse> content = page.getContent().stream()
                .map(outcomeTransactionMapper::toResponse)
                .collect(Collectors.toList());

        return PageResponse.<OutcomeTransactionResponse>builder()
                .content(content)
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }

    /**
     * Get outcome transactions by status
     */
    public PageResponse<OutcomeTransactionResponse> getOutcomeTransactionsByStatus(
            Long clubId, TransactionStatus status, Pageable pageable) throws AppException {
        ClubWallet clubWallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_WALLET_NOT_FOUND));

        Page<OutcomeTransaction> page = outcomeTransactionRepository.findByClubWalletIdAndStatus(
                clubWallet.getId(), status, pageable);

        List<OutcomeTransactionResponse> content = page.getContent().stream()
                .map(outcomeTransactionMapper::toResponse)
                .collect(Collectors.toList());

        return PageResponse.<OutcomeTransactionResponse>builder()
                .content(content)
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }

    /**
     * Get outcome transaction by ID
     */
    public OutcomeTransactionResponse getOutcomeTransactionById(Long transactionId) throws AppException {
        OutcomeTransaction transaction = outcomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        return outcomeTransactionMapper.toResponse(transaction);
    }

    /**
     * Create a new outcome transaction
     */
    @Transactional
    public OutcomeTransactionResponse createOutcomeTransaction(Long clubId, CreateOutcomeTransactionRequest request) throws AppException {
        ClubWallet clubWallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_WALLET_NOT_FOUND));

        // Get current user
        Long currentUserId = userService.getCurrentUserId();
        User createdBy = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Generate unique transaction code
        String transactionCode = generateUniqueTransactionCode("OUT");

        // Build outcome transaction
        OutcomeTransaction transaction = OutcomeTransaction.builder()
                .transactionCode(transactionCode)
                .amount(request.getAmount())
                .description(request.getDescription())
                .transactionDate(request.getTransactionDate())
                .recipient(request.getRecipient())
                .purpose(request.getPurpose())
                .status(TransactionStatus.PENDING)
                .notes(request.getNotes())
                .receiptUrl(request.getReceiptUrl())
                .clubWallet(clubWallet)
                .createdBy(createdBy)
                .build();

        OutcomeTransaction savedTransaction = outcomeTransactionRepository.save(transaction);
        log.info("Created outcome transaction: {} for club: {}", transactionCode, clubId);

        return outcomeTransactionMapper.toResponse(savedTransaction);
    }

    /**
     * Update outcome transaction
     */
    @Transactional
    public OutcomeTransactionResponse updateOutcomeTransaction(Long transactionId, UpdateOutcomeTransactionRequest request) throws AppException {
        OutcomeTransaction transaction = outcomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        // Only allow update if status is PENDING
        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new AppException(ErrorCode.TRANSACTION_CANNOT_BE_UPDATED);
        }

        // Update fields
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setRecipient(request.getRecipient());
        transaction.setPurpose(request.getPurpose());
        transaction.setNotes(request.getNotes());
        transaction.setReceiptUrl(request.getReceiptUrl());

        OutcomeTransaction updatedTransaction = outcomeTransactionRepository.save(transaction);
        log.info("Updated outcome transaction: {}", transactionId);

        return outcomeTransactionMapper.toResponse(updatedTransaction);
    }

    /**
     * Approve outcome transaction (PENDING -> SUCCESS)
     * This will update the club wallet balance by deducting the amount
     */
    @Transactional
    public OutcomeTransactionResponse approveOutcomeTransaction(Long transactionId) throws AppException {
        OutcomeTransaction transaction = outcomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new AppException(ErrorCode.TRANSACTION_ALREADY_PROCESSED);
        }

        // Check if wallet has sufficient balance
        ClubWallet clubWallet = transaction.getClubWallet();
        if (clubWallet.getBalance().compareTo(transaction.getAmount()) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);
        }

        // Update transaction status
        transaction.setStatus(TransactionStatus.SUCCESS);

        // Update club wallet balance
        clubWallet.setBalance(clubWallet.getBalance().subtract(transaction.getAmount()));
        clubWallet.setTotalOutcome(clubWallet.getTotalOutcome().add(transaction.getAmount()));

        clubWalletRepository.save(clubWallet);
        OutcomeTransaction approvedTransaction = outcomeTransactionRepository.save(transaction);

        log.info("Approved outcome transaction: {}, amount: {}", transactionId, transaction.getAmount());

        return outcomeTransactionMapper.toResponse(approvedTransaction);
    }

    /**
     * Reject outcome transaction (PENDING -> CANCELLED)
     */
    @Transactional
    public OutcomeTransactionResponse rejectOutcomeTransaction(Long transactionId) throws AppException {
        OutcomeTransaction transaction = outcomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new AppException(ErrorCode.TRANSACTION_ALREADY_PROCESSED);
        }

        transaction.setStatus(TransactionStatus.CANCELLED);
        OutcomeTransaction rejectedTransaction = outcomeTransactionRepository.save(transaction);

        log.info("Rejected outcome transaction: {}", transactionId);

        return outcomeTransactionMapper.toResponse(rejectedTransaction);
    }

    /**
     * Delete outcome transaction (only if PENDING or CANCELLED)
     */
    @Transactional
    public void deleteOutcomeTransaction(Long transactionId) throws AppException {
        OutcomeTransaction transaction = outcomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        // Can only delete PENDING or CANCELLED transactions
        if (transaction.getStatus() == TransactionStatus.SUCCESS ||
            transaction.getStatus() == TransactionStatus.PROCESSING) {
            throw new AppException(ErrorCode.TRANSACTION_CANNOT_BE_DELETED);
        }

        outcomeTransactionRepository.delete(transaction);
        log.info("Deleted outcome transaction: {}", transactionId);
    }

    /**
     * Generate unique transaction code
     */
    private String generateUniqueTransactionCode(String prefix) {
        String transactionCode;
        do {
            transactionCode = prefix + "-" + LocalDateTime.now().format(
                    java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + "-" +
                    UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (outcomeTransactionRepository.existsByTransactionCode(transactionCode));

        return transactionCode;
    }
}

