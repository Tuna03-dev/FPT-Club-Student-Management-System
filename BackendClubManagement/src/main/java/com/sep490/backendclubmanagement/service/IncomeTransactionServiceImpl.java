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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncomeTransactionServiceImpl implements IncomeTransactionService {

    private final IncomeTransactionRepository incomeTransactionRepository;
    private final ClubWalletRepository clubWalletRepository;
    private final FeeRepository feeRepository;
    private final UserRepository userRepository;
    private final IncomeTransactionMapper incomeTransactionMapper;
    private final UserService userService;
    private final RoleMemberShipRepository roleMemberShipRepository;
    private final ClubWalletService clubWalletService;

    /**
     * Get all income transactions for a club with pagination
     */
    public PageResponse<IncomeTransactionResponse> getIncomeTransactions(Long clubId, Pageable pageable) throws AppException {
        // Auto-create wallet if not exists
        ClubWallet clubWallet = clubWalletService.getOrCreateWalletForClub(clubId);

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
        // Auto-create wallet if not exists
        ClubWallet clubWallet = clubWalletService.getOrCreateWalletForClub(clubId);

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
     * Get income transactions with filters
     * Search uses Vietnamese accent-insensitive matching (VietnameseTextNormalizer)
     */
    @Override
    public PageResponse<IncomeTransactionResponse> getIncomeTransactionsWithFilters(
            Long clubId,
            String search,
            TransactionStatus status,
            LocalDate fromDate,
            LocalDate toDate,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            String source,
            Long feeId,
            Pageable pageable) throws AppException {
        
        // Auto-create wallet if not exists
        ClubWallet clubWallet = clubWalletService.getOrCreateWalletForClub(clubId);

        // Normalize search term for Vietnamese accent-insensitive search
        final String normalizedSearch = (search != null && !search.trim().isEmpty()) 
                ? search.trim() 
                : null;

        // Build dynamic query specification (without text search)
        Specification<IncomeTransaction> spec = (root, query, cb) -> {
            List<Predicate> predicates = new java.util.ArrayList<>();

            // Club wallet filter (required)
            predicates.add(cb.equal(root.get("clubWallet").get("id"), clubWallet.getId()));

            // Status filter
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            // Date range filter
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("transactionDate"), fromDate));
            }
            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("transactionDate"), toDate));
            }

            // Amount range filter
            if (minAmount != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), minAmount));
            }
            if (maxAmount != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("amount"), maxAmount));
            }

            // Source filter
            if (source != null && !source.trim().isEmpty() && !"all".equalsIgnoreCase(source)) {
                predicates.add(cb.equal(cb.lower(root.get("source")), source.toLowerCase()));
            }

            // Fee filter
            if (feeId != null) {
                predicates.add(cb.equal(root.get("fee").get("id"), feeId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<IncomeTransaction> page = incomeTransactionRepository.findAll(spec, pageable);

        // 🔍 Apply Vietnamese accent-insensitive search filter in Java
        List<IncomeTransaction> filteredTransactions = page.getContent();
        if (normalizedSearch != null) {
            filteredTransactions = filteredTransactions.stream()
                    .filter(transaction -> {
                        // Build searchable fields
                        String reference = transaction.getReference() != null ? transaction.getReference() : "";
                        String description = transaction.getDescription() != null ? transaction.getDescription() : "";
                        String payerName = (transaction.getUser() != null && transaction.getUser().getFullName() != null) 
                                ? transaction.getUser().getFullName() 
                                : "";
                        
                        // Use VietnameseTextNormalizer for accent-insensitive search
                        return com.sep490.backendclubmanagement.util.VietnameseTextNormalizer.matchesAny(
                                normalizedSearch,
                                reference,
                                description,
                                payerName
                        );
                    })
                    .collect(Collectors.toList());
        }

        List<IncomeTransactionResponse> content = filteredTransactions.stream()
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
     * - If user has CLUB_OFFICER role: status = SUCCESS (auto-approved) and update wallet immediately
     * - Otherwise (CLUB_TREASURER or other): status = PENDING (needs approval)
     */
    @Transactional
    public IncomeTransactionResponse createIncomeTransaction(Long clubId, CreateIncomeTransactionRequest request) throws AppException {
        // Auto-create wallet if not exists
        ClubWallet clubWallet = clubWalletService.getOrCreateWalletForClub(clubId);

        // Get current user
        Long currentUserId = userService.getCurrentUserId();
        User createdBy = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 🔒 DUPLICATE PAYMENT CHECK: Ngăn chặn 1 người đóng cùng 1 khoản phí 2 lần
        if (request.getFeeId() != null && request.getUserId() != null) {
            // Kiểm tra xem user đã thanh toán thành công fee này chưa
            boolean alreadyPaid = incomeTransactionRepository.existsByUser_IdAndFee_IdAndStatus(
                    request.getUserId(),
                    request.getFeeId(),
                    TransactionStatus.SUCCESS
            );

            if (alreadyPaid) {
                User user = userRepository.findById(request.getUserId())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
                Fee fee = feeRepository.findById(request.getFeeId())
                        .orElseThrow(() -> new AppException(ErrorCode.FEE_NOT_FOUND));

                log.warn("[Duplicate Payment] User {} đã thanh toán khoản phí {} trước đó. Từ chối tạo giao dịch mới.",
                        user.getFullName(), fee.getTitle());

                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        String.format("Người dùng %s đã thanh toán khoản phí '%s' trước đó. Không thể thanh toán lại.",
                                user.getFullName(), fee.getTitle()));
            }
        }

        boolean isClubOfficer = roleMemberShipRepository.existsClubAdmin(currentUserId, clubId);
        TransactionStatus initialStatus = isClubOfficer ? TransactionStatus.SUCCESS : TransactionStatus.PENDING;


        String reference = generateUniqueReference("INC");


        IncomeTransaction.IncomeTransactionBuilder builder = IncomeTransaction.builder()
                .reference(reference)
                .amount(request.getAmount())
                .description(request.getDescription())
                .transactionDate(request.getTransactionDate())
                .source(request.getSource())
                .status(initialStatus)
                .notes(request.getNotes())
                .receiptUrl(request.getReceiptUrl())
                .clubWallet(clubWallet)
                .createdBy(createdBy);


        if (request.getFeeId() != null) {
            Fee fee = feeRepository.findById(request.getFeeId())
                    .orElseThrow(() -> new AppException(ErrorCode.FEE_NOT_FOUND));
            builder.fee(fee);
        }


        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            builder.user(user);
        }

        IncomeTransaction savedTransaction = incomeTransactionRepository.save(builder.build());

        clubWalletService.processIncomeTransaction(savedTransaction, null);

        if (isClubOfficer) {
            log.info("Created and auto-approved income transaction: {} for club: {} by CLUB_OFFICER. Wallet updated.", reference, clubId);
        } else {
            log.info("Created income transaction: {} for club: {} with PENDING status", reference, clubId);
        }

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
        transaction.setReceiptUrl(request.getReceiptUrl());

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

        // Store old state for wallet processing
        IncomeTransaction oldTransaction = IncomeTransaction.builder()
                .status(transaction.getStatus())
                .amount(transaction.getAmount())
                .clubWallet(transaction.getClubWallet())
                .build();

        // Update transaction status to SUCCESS
        transaction.setStatus(TransactionStatus.SUCCESS);
        IncomeTransaction approvedTransaction = incomeTransactionRepository.save(transaction);

        // Process wallet update (TiDB doesn't support triggers - handle in application)
        clubWalletService.processIncomeTransaction(approvedTransaction, oldTransaction);

        log.info("Approved income transaction: {}, amount: {}. Wallet updated.", transactionId, transaction.getAmount());


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

