package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateFeeRequest;
import com.sep490.backendclubmanagement.dto.request.PayOSCreatePaymentRequest;
import com.sep490.backendclubmanagement.dto.request.PayOSWebhookRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateFeeRequest;
import com.sep490.backendclubmanagement.dto.response.FeeDetailResponse;
import com.sep490.backendclubmanagement.dto.response.PayOSCreatePaymentResponse;
import com.sep490.backendclubmanagement.dto.websocket.PaymentWebSocketPayload;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.FeeMapper;
import com.sep490.backendclubmanagement.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.PaymentLink;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeeService {
    private final FeeRepository feeRepository;
    private final ClubRepository clubRepository;
    private final FeeMapper feeMapper;
    private final PayOSIntegrationService payOSIntegrationService;
    private final UserRepository userRepository;
    private final IncomeTransactionRepository incomeTransactionRepository;
    private final ClubWalletRepository clubWalletRepository;
    private final PayOSPaymentRepository payOSPaymentRepository;
    private final WebSocketService webSocketService;
    private final RoleMemberShipRepository roleMemberShipRepository;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;


    public List<FeeDetailResponse> getPaidFeesByUser(Long clubId, Long userId) {
        List<Fee> fees = feeRepository.findPaidFeesByClubIdAndUserId(clubId, userId);
        return fees.stream()
                .map(fee -> {
                    FeeDetailResponse response = feeMapper.toFeeDetailResponse(fee);

                    // Tìm transaction của user này cho fee này
                    IncomeTransaction userTransaction = fee.getIncomeTransactions().stream()
                            .filter(t -> t.getUser().getId().equals(userId)
                                    && t.getStatus() == TransactionStatus.SUCCESS)
                            .findFirst()
                            .orElse(null);

                    // Set thông tin thanh toán
                    if (userTransaction != null) {
                        response.setPaidDate(userTransaction.getTransactionDate());
                        response.setTransactionReference(userTransaction.getReference());
                    }

                    return response;
                })
                .collect(Collectors.toList());
    }



    @Transactional
    public FeeDetailResponse createFee(Long clubId, CreateFeeRequest request) throws AppException {
        Club club = clubRepository.findById(clubId)
            .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));
        Fee fee = Fee.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .amount(request.getAmount())
                .feeType(request.getFeeType())
                .dueDate(request.getDueDate())
                .isMandatory(request.getIsMandatory())
                .isLocked(false)
                .club(club)
                .build();
        Fee saved = feeRepository.save(fee);
        return feeMapper.toFeeDetailResponse(saved);
    }

    public List<FeeDetailResponse> getFeesByClubId(Long clubId) {
        List<Fee> fees = feeRepository.findByClub_Id(clubId);
        return fees.stream()
                .map(fee -> {
                    FeeDetailResponse feeDetailResponse = feeMapper.toFeeDetailResponse(fee);

                    int paidMembers = fee.getIncomeTransactions().stream()
                            .map(IncomeTransaction::getUser)
                            .collect(Collectors.toSet())
                            .size();

                    long totalMembers = roleMemberShipRepository.countActiveMembersInCurrentSemester(clubId);



                    feeDetailResponse.setPaidMembers(paidMembers);
                    feeDetailResponse.setTotalMembers((int)totalMembers);

                    return feeDetailResponse;
                })
                .collect(Collectors.toList());
    }

    public boolean isFeeTitleExists(Long clubId, String title) {
        return feeRepository.existsByTitleIgnoreCaseAndClub_Id(title, clubId);
    }

    public boolean isFeeTitleExistsExcluding(Long clubId, String title, Long excludeFeeId) {
        return feeRepository.existsByTitleIgnoreCaseAndClub_IdAndIdNot(title, clubId, excludeFeeId);
    }

    @Transactional
    public FeeDetailResponse updateFee(Long feeId, UpdateFeeRequest request) throws AppException {
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Fee not found"));

        // Check if title already exists (excluding current fee)
        if (isFeeTitleExistsExcluding(fee.getClub().getId(), request.getTitle(), feeId)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên khoản phí đã tồn tại");
        }

        // Update fee fields
        fee.setTitle(request.getTitle());
        fee.setDescription(request.getDescription());
        fee.setAmount(request.getAmount());
        fee.setFeeType(request.getFeeType());
        fee.setDueDate(request.getDueDate());
        fee.setIsMandatory(request.getIsMandatory());


        Fee updated = feeRepository.save(fee);
        return feeMapper.toFeeDetailResponse(updated);
    }

    @Transactional
    public FeeDetailResponse lockFee(Long feeId, Boolean lock) throws AppException {
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Fee not found"));
        fee.setIsLocked(lock);
        feeRepository.save(fee);
        return feeMapper.toFeeDetailResponse(fee);
    }

    @Transactional
    public void deleteFee(Long feeId) throws AppException {
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Fee not found"));

        // Check if any members have already paid
        int paidCount = fee.getIncomeTransactions() != null 
                ? fee.getIncomeTransactions().size() 
                : 0;

        if (paidCount > 0 ) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, 
                    String.format("Không thể xóa khoản phí đã có %d thành viên đóng phí", paidCount));
        }



        feeRepository.delete(fee);
    }


    @Transactional
    public PayOSCreatePaymentResponse generatePaymentQR(Long clubId, Long feeId, Long userId) throws AppException {
        // Validate club exists
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));

        // Validate fee exists and belongs to club
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Khoản phí không tồn tại"));
        if (!fee.getClub().getId().equals(clubId)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Khoản phí không thuộc câu lạc bộ này");
        }

        // Validate user exists
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Người dùng không tồn tại"));


        long orderCode = createOrderCode(feeId, userId);



        // Build PayOS payment request
        PayOSCreatePaymentRequest paymentRequest = new PayOSCreatePaymentRequest();
        paymentRequest.setOrderCode(orderCode);
        paymentRequest.setAmount(fee.getAmount().longValue());
        String description = String.format(
                "%s-%s",
                fee.getTitle(),
                user.getStudentCode() != null ? user.getStudentCode() : user.getId()
        );
        if (description.length() > 25) {
            description = description.substring(0, 25);
        }
        paymentRequest.setDescription(description);
        paymentRequest.setBuyerName(user.getFullName());
        paymentRequest.setBuyerEmail(user.getEmail());
        paymentRequest.setBuyerPhone(user.getPhoneNumber() != null ? user.getPhoneNumber() : "");
        String returnUrl = String.format("%s/myclub/%d/payments?feeId=%d&status=success", frontendUrl, clubId, feeId);
        String cancelUrl = String.format("%s/myclub/%d/payments?feeId=%d&status=cancel", frontendUrl, clubId, feeId);
        paymentRequest.setReturnUrl(returnUrl);
        paymentRequest.setCancelUrl(cancelUrl);
        long expiredAt = Instant.now().plusSeconds(24 * 60 * 60).getEpochSecond();
        paymentRequest.setExpiredAt(expiredAt);
        PayOSCreatePaymentRequest.Item item = new PayOSCreatePaymentRequest.Item();
        item.setName(fee.getTitle());
        item.setQuantity(1);
        item.setPrice(fee.getAmount().longValue());
        item.setUnit("VND");
        item.setTaxPercentage(0);
        List<PayOSCreatePaymentRequest.Item> items = new ArrayList<>();
        items.add(item);
        paymentRequest.setItems(items);
        PayOSCreatePaymentResponse response = payOSIntegrationService.createPaymentRequest(clubId, paymentRequest);
        return response;
    }

    private Long createOrderCode(Long feeId, Long userId) throws AppException {
        int feeIdLength = String.valueOf(feeId).length();
        int userIdLength = String.valueOf(userId).length();

        // Validate độ dài
        if (feeIdLength > 9 || userIdLength > 9) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "FeeId hoặc UserId quá dài (max 9 chữ số)");
        }

        // 🔥 GIỚI HẠN TỐI ĐA 16 CHỮ SỐ (PayOS JavaScript limit)
        int usedDigits = 2 + feeIdLength + userIdLength;
        int timestampDigits = 16 - usedDigits; // Đổi từ 18 → 16

        if (timestampDigits < 1) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    String.format("FeeId(%d) + UserId(%d) quá dài. Tổng phải <= 14 chữ số",
                            feeIdLength, userIdLength));
        }

        // Lấy timestamp và rút gọn
        long timestamp = System.currentTimeMillis();
        long timestampModulo = (long) Math.pow(10, timestampDigits);
        long timestampTrimmed = timestamp % timestampModulo;

        // Format orderCode
        String orderCodeStr = String.format("%d%d%d%d%0" + timestampDigits + "d",
                feeIdLength,
                userIdLength,
                feeId,
                userId,
                timestampTrimmed
        );

        long orderCode = Long.parseLong(orderCodeStr);

        // 🔥 VALIDATE GIỚI HẠN PAYOS (JavaScript safe integer)
        if (orderCode > 9007199254740991L) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "OrderCode vượt quá giới hạn PayOS (max 16 digits)");
        }

        return orderCode;
    }

    private Long[] parseOrderCode(Long orderCode) throws AppException {
        String str = String.valueOf(orderCode);

        // Tối thiểu: 2 metadata + 1 feeId + 1 userId + 1 timestamp = 5 digits
        // Tối đa: 16 digits
        if (str.length() < 5 || str.length() > 16) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "OrderCode không hợp lệ. Length: " + str.length());
        }

        try {
            // Đọc metadata
            int feeIdLength = Integer.parseInt(str.substring(0, 1));
            int userIdLength = Integer.parseInt(str.substring(1, 2));

            // Validate metadata
            if (feeIdLength < 1 || feeIdLength > 9 || userIdLength < 1 || userIdLength > 9) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Độ dài feeId hoặc userId không hợp lệ");
            }

            // Tính vị trí
            int feeIdStart = 2;
            int feeIdEnd = feeIdStart + feeIdLength;
            int userIdStart = feeIdEnd;
            int userIdEnd = userIdStart + userIdLength;

            // Validate
            if (str.length() < userIdEnd) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        String.format("OrderCode không đủ dài. Expected >= %d, Actual: %d",
                                userIdEnd, str.length()));
            }

            // Parse
            Long feeId = Long.parseLong(str.substring(feeIdStart, feeIdEnd));
            Long userId = Long.parseLong(str.substring(userIdStart, userIdEnd));

            return new Long[]{feeId, userId};

        } catch (NumberFormatException | StringIndexOutOfBoundsException e) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Parse orderCode thất bại: " + str);
        }
    }


    @Transactional
    public void handlePaymentWebhook(PayOSWebhookRequest webhookRequest) throws AppException {
        if (webhookRequest == null || webhookRequest.getData() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Webhook payload không hợp lệ");
        }

        //        // 0️⃣ Verify signature (THÊM ĐÂY - Quan trọng!)
        //        try {
        //            payosService.verifySignature(webhookRequest.getSignature(), webhookRequest); // Implement verify HMAC
        //        } catch (SignatureException e) {
        //            log.error("[PayOS] Invalid signature: {}", e.getMessage());
        //            throw new AppException(ErrorCode.VALIDATION_ERROR, "Webhook signature không hợp lệ");
        //        }

        Long orderCode = webhookRequest.getData().getOrderCode();
        Long[] parsed = parseOrderCode(orderCode); // Handle exception nếu parse fail
        Long feeId = parsed[0];
        Long userId = parsed[1];

        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy khoản phí"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy người dùng"));

        ClubWallet clubWallet = clubWalletRepository.findByClub_Id(fee.getClub().getId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy ví câu lạc bộ"));

        String reference = String.valueOf(orderCode);

        // 1️⃣ Tránh xử lý webhook trùng
        if (incomeTransactionRepository.existsByReference(reference)) {
            log.info("[PayOS] Webhook đã được xử lý: orderCode={}", orderCode);
            return;
        }

        // 2️⃣ Tránh một người thanh toán lại cùng khoản phí
        if (incomeTransactionRepository.existsByUser_IdAndFee_IdAndStatus(userId, feeId, TransactionStatus.SUCCESS)) {
            log.warn("[PayOS] Người dùng {} đã thanh toán khoản phí {} trước đó. Bỏ qua webhook.",
                    user.getFullName(), fee.getTitle());
            return;
        }

        // 3️⃣ Chỉ xử lý nếu thanh toán thành công (sửa desc thành "PAID" theo docs PayOS)
        if (!"success".equalsIgnoreCase(webhookRequest.getDesc())) { // Confirm docs: thường "PAID"
            log.info("[PayOS] Webhook trạng thái không phải PAID, bỏ qua: desc={}", webhookRequest.getDesc());
            return;
        }




        // 4️⃣ Tạo và save PayOSPayment trước (transient -> persistent)
        PayOSPayment payosPayment = PayOSPayment.builder()
                .code(webhookRequest.getCode())
                .success(true)
                .transactionCode(webhookRequest.getData().getTransactionCode())
                .orderCode(webhookRequest.getData().getOrderCode().toString())
                .amount(fee.getAmount()) // Hoặc từ webhook.data.amount nếu khác
                .description(webhookRequest.getData().getDescription())
                .accountNumber(webhookRequest.getData().getAccountNumber())
                .reference(reference)
                .transactionDateTime(parseDateTime(webhookRequest.getData().getTransactionDateTime()))
                .currency("VND")
                .paymentLinkId(webhookRequest.getData().getPaymentLinkId())
                .paymentStatus(PaymentStatus.PAID) // Enum từ desc
                .paymentMethod(webhookRequest.getData().getPaymentMethod())
                .paymentTime(LocalDateTime.now())
                // Counter account (nếu có từ webhook)
                .counterAccountBankId(webhookRequest.getData().getCounterAccountBankId())
                .counterAccountBankName(webhookRequest.getData().getCounterAccountBankName())
                .counterAccountName(webhookRequest.getData().getCounterAccountName())
                .counterAccountNumber(webhookRequest.getData().getCounterAccountNumber())
                // Virtual account (nếu dùng)
                .virtualAccountName(webhookRequest.getData().getVirtualAccountName())
                .virtualAccountNumber(webhookRequest.getData().getVirtualAccountNumber())
                .build();

        // Explicit save PayOSPayment trước khi set vào IncomeTransaction
        payOSPaymentRepository.save(payosPayment);  // Giả sử bạn có PayOSPaymentRepository

        // 5️⃣ Ghi nhận giao dịch mới + link PayOSPayment (đã persistent)
        IncomeTransaction transaction = IncomeTransaction.builder()
                .reference(reference)
                .amount(fee.getAmount())
                .description("Thanh toán khoản phí: " + fee.getTitle())
                .transactionDate(LocalDateTime.now())
                .source("PayOS")
                .status(TransactionStatus.SUCCESS)
                .clubWallet(clubWallet)
                .fee(fee)
                .user(user)
                .payOSPayment(payosPayment) // Link OneToOne (payosPayment đã saved)
                .build();

        // Set bidirectional reference để maintain consistency
        transaction.setPayOSPayment(payosPayment);
        payosPayment.setIncomeTransaction(transaction);

        incomeTransactionRepository.save(transaction); // Cascade không cần thiết nữa, nhưng OK nếu có

        //         Cập nhật Fee progress (THÊM ĐÂY - Track % đóng)
        //        fee.setPaidMembers(fee.getPaidMembers() != null ? fee.getPaidMembers() + 1 : 1);
        //        feeRepository.save(fee);

        // 7️⃣ Cập nhật ví CLB
        clubWallet.setBalance(clubWallet.getBalance().add(fee.getAmount()));
        clubWallet.setTotalIncome(clubWallet.getTotalIncome().add(fee.getAmount()));
        clubWalletRepository.save(clubWallet);

        log.info("[PayOS] Giao dịch thành công | user={} | fee={} | amount={} | orderCode={}",
                user.getFullName(), fee.getTitle(), fee.getAmount(), orderCode);

        PaymentWebSocketPayload payload = PaymentWebSocketPayload.builder()
                .userId(user.getId())
                .feeId(fee.getId())
                .amount(fee.getAmount())
                .orderCode(orderCode)
                .status("SUCCESS")
                .transactionCode(webhookRequest.getData().getTransactionCode())
                .message("Thanh toán khoản phí thành công")
                .build();

        webSocketService.sendPaymentSuccess(user.getEmail(), payload);
    }

    private LocalDateTime parseDateTime(String dateTimeStr) {
        List<String> patterns = List.of(
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ssXXX"
        );

        for (String pattern : patterns) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern);
                return LocalDateTime.parse(dateTimeStr, formatter);
            } catch (Exception ignored) {}
        }

        throw new IllegalArgumentException("Unrecognized datetime format: " + dateTimeStr);
    }

    /**
     * Get unpaid fees for a user in a club
     */
    public List<FeeDetailResponse> getUnpaidFeesByUser(Long clubId, Long userId) {
        List<Fee> fees = feeRepository.findUnpaidFeesByClubIdAndUserId(clubId, userId);
        return fees.stream().map(feeMapper::toFeeDetailResponse).collect(Collectors.toList());
    }
}

