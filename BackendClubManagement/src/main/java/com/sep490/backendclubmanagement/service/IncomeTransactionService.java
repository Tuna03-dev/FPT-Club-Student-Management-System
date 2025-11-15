package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateIncomeTransactionRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateIncomeTransactionRequest;
import com.sep490.backendclubmanagement.dto.response.IncomeTransactionResponse;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.IncomeTransactionMapper;
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
public class IncomeTransactionService {

    private final IncomeTransactionRepository incomeTransactionRepository;
    private final ClubWalletRepository clubWalletRepository;
    private final FeeRepository feeRepository;
    private final UserRepository userRepository;
    private final IncomeTransactionMapper incomeTransactionMapper;
    private final UserService userService;

    /**
     * Get all income transactions for a club with pagination
     */
    public PageResponse<IncomeTransactionResponse> getIncomeTransactions(Long clubId, Pageable pageable) throws AppException {
        ClubWallet clubWallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_WALLET_NOT_FOUND));

        Page<IncomeTransaction> page = incomeTransactionRepository.findByClubWalletId(clubWallet.getId(), pageable);

        List<IncomeTransactionResponse> content = page.getContent().stream()
                .map(incomeTransactionMapper::toResponse)
                .collect(Collectors.toList());

        return PageResponse.<IncomeTransactionResponse>builder()
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
     * Get income transactions by status
     */
    public PageResponse<IncomeTransactionResponse> getIncomeTransactionsByStatus(
            Long clubId, TransactionStatus status, Pageable pageable) throws AppException {
        ClubWallet clubWallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_WALLET_NOT_FOUND));

        Page<IncomeTransaction> page = incomeTransactionRepository.findByClubWalletIdAndStatus(
                clubWallet.getId(), status, pageable);

        List<IncomeTransactionResponse> content = page.getContent().stream()
                .map(incomeTransactionMapper::toResponse)
                .collect(Collectors.toList());

        return PageResponse.<IncomeTransactionResponse>builder()
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
     * Get income transaction by ID
     */
    public IncomeTransactionResponse getIncomeTransactionById(Long transactionId) throws AppException {
        IncomeTransaction transaction = incomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        return incomeTransactionMapper.toResponse(transaction);
    }

    /**
     * Create a new income transaction
     */
    @Transactional
    public IncomeTransactionResponse createIncomeTransaction(Long clubId, CreateIncomeTransactionRequest request) throws AppException {
        ClubWallet clubWallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_WALLET_NOT_FOUND));

        // Get current user
        Long currentUserId = userService.getCurrentUserId();
        User createdBy = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Generate unique reference
        String reference = generateUniqueReference("INC");

        // Build income transaction
        IncomeTransaction.IncomeTransactionBuilder builder = IncomeTransaction.builder()
                .reference(reference)
                .amount(request.getAmount())
                .description(request.getDescription())
                .transactionDate(request.getTransactionDate())
                .source(request.getSource())
                .status(TransactionStatus.PENDING)
                .notes(request.getNotes())
                .clubWallet(clubWallet)
                .createdBy(createdBy);

        // Link to fee if provided
        if (request.getFeeId() != null) {
            Fee fee = feeRepository.findById(request.getFeeId())
                    .orElseThrow(() -> new AppException(ErrorCode.FEE_NOT_FOUND));
            builder.fee(fee);
        }

        // Link to user if provided
        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            builder.user(user);
        }

        IncomeTransaction savedTransaction = incomeTransactionRepository.save(builder.build());
        log.info("Created income transaction: {} for club: {}", reference, clubId);

        return incomeTransactionMapper.toResponse(savedTransaction);
    }

    /**
     * Update income transaction
     */
    @Transactional
    public IncomeTransactionResponse updateIncomeTransaction(Long transactionId, UpdateIncomeTransactionRequest request) throws AppException {
        IncomeTransaction transaction = incomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        // Only allow update if status is PENDING
        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new AppException(ErrorCode.TRANSACTION_CANNOT_BE_UPDATED);
        }

        // Update fields
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setSource(request.getSource());
        transaction.setNotes(request.getNotes());

        // Update fee if provided
        if (request.getFeeId() != null) {
            Fee fee = feeRepository.findById(request.getFeeId())
                    .orElseThrow(() -> new AppException(ErrorCode.FEE_NOT_FOUND));
            transaction.setFee(fee);
        } else {
            transaction.setFee(null);
        }

        // Update user if provided
        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            transaction.setUser(user);
        } else {
            transaction.setUser(null);
        }

        IncomeTransaction updatedTransaction = incomeTransactionRepository.save(transaction);
        log.info("Updated income transaction: {}", transactionId);

        return incomeTransactionMapper.toResponse(updatedTransaction);
    }

    /**
     * Approve income transaction (PENDING -> SUCCESS)
     * This will update the club wallet balance
     */
    @Transactional
    public IncomeTransactionResponse approveIncomeTransaction(Long transactionId) throws AppException {
        IncomeTransaction transaction = incomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new AppException(ErrorCode.TRANSACTION_ALREADY_PROCESSED);
        }

        // Update transaction status
        transaction.setStatus(TransactionStatus.SUCCESS);

        // Update club wallet balance
        ClubWallet clubWallet = transaction.getClubWallet();
        clubWallet.setBalance(clubWallet.getBalance().add(transaction.getAmount()));
        clubWallet.setTotalIncome(clubWallet.getTotalIncome().add(transaction.getAmount()));

        clubWalletRepository.save(clubWallet);
        IncomeTransaction approvedTransaction = incomeTransactionRepository.save(transaction);

        log.info("Approved income transaction: {}, amount: {}", transactionId, transaction.getAmount());

        return incomeTransactionMapper.toResponse(approvedTransaction);
    }

    /**
     * Reject income transaction (PENDING -> CANCELLED)
     */
    @Transactional
    public IncomeTransactionResponse rejectIncomeTransaction(Long transactionId) throws AppException {
        IncomeTransaction transaction = incomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new AppException(ErrorCode.TRANSACTION_ALREADY_PROCESSED);
        }

        transaction.setStatus(TransactionStatus.CANCELLED);
        IncomeTransaction rejectedTransaction = incomeTransactionRepository.save(transaction);

        log.info("Rejected income transaction: {}", transactionId);

        return incomeTransactionMapper.toResponse(rejectedTransaction);
    }

    /**
     * Delete income transaction (only if PENDING or CANCELLED)
     */
    @Transactional
    public void deleteIncomeTransaction(Long transactionId) throws AppException {
        IncomeTransaction transaction = incomeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        // Can only delete PENDING or CANCELLED transactions
        if (transaction.getStatus() == TransactionStatus.SUCCESS ||
            transaction.getStatus() == TransactionStatus.PROCESSING) {
            throw new AppException(ErrorCode.TRANSACTION_CANNOT_BE_DELETED);
        }

        incomeTransactionRepository.delete(transaction);
        log.info("Deleted income transaction: {}", transactionId);
    }

    /**
     * Generate unique transaction reference
     */
    private String generateUniqueReference(String prefix) {
        String reference;
        do {
            reference = prefix + "-" + LocalDateTime.now().format(
                    java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + "-" +
                    UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (incomeTransactionRepository.existsByReference(reference));

        return reference;
    }
}

