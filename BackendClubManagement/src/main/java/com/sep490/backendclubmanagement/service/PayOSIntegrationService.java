package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.PayOSConfigRequest;
import com.sep490.backendclubmanagement.dto.response.PayOSConfigResponse;
import com.sep490.backendclubmanagement.dto.response.PayOSTestConnectionResponse;
import com.sep490.backendclubmanagement.dto.response.RecentPaymentResponse;
import com.sep490.backendclubmanagement.dto.request.PayOSCreatePaymentRequest;
import com.sep490.backendclubmanagement.dto.response.PayOSCreatePaymentResponse;
import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.entity.ClubWallet;
import com.sep490.backendclubmanagement.entity.PayOSPayment;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.ClubWalletRepository;
import com.sep490.backendclubmanagement.repository.PayOSPaymentRepository;
import com.sep490.backendclubmanagement.security.EncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import vn.payos.PayOS;
import vn.payos.exception.APIException;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLinkItem;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayOSIntegrationService {

    private final ClubRepository clubRepository;
    private final ClubWalletRepository clubWalletRepository;
    private final PayOSPaymentRepository payOSPaymentRepository;
    private final EncryptionService encryptionService;

    private static final String PAYOS_PAYMENT_REQUEST_ENDPOINT = "https://api-merchant.payos.vn/v2/payment-requests";

    @Value("${app.payos.webhook-url}")
    private String webhookUrl;

    @Transactional(readOnly = true)
    public PayOSConfigResponse getConfig(Long clubId) throws AppException {
        ClubWallet wallet = clubWalletRepository.findByClub_Id(clubId).orElse(null);
        boolean configured = wallet != null && wallet.getPayOsClientId() != null && !wallet.getPayOsClientId().isBlank();
        boolean active = configured && (wallet.getPayOsStatus() == null || wallet.getPayOsStatus().equalsIgnoreCase("ACTIVE"));

        // Mask sensitive clientId before returning to client
        String maskedClientId = null;
        if (wallet != null && wallet.getPayOsClientId() != null) {
            maskedClientId = encryptionService.maskSensitiveData(wallet.getPayOsClientId());
        }

        return PayOSConfigResponse.builder()
                .clubId(clubId)
                .clientId(maskedClientId)
                .active(active)
                .configured(configured)
                .build();
    }

    @Transactional
    public PayOSConfigResponse upsertConfig(Long clubId, PayOSConfigRequest request) throws AppException {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));

        ClubWallet wallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseGet(() -> {
                    ClubWallet w = new ClubWallet();
                    w.setClub(club);
                    w.setBalance(BigDecimal.ZERO);
                    w.setTotalIncome(BigDecimal.ZERO);
                    w.setTotalOutcome(BigDecimal.ZERO);
                    w.setCurrency("VND");
                    w.setPayOsStatus("ACTIVE");
                    return w;
                });

        wallet.setPayOsClientId(request.getClientId());
        wallet.setPayOsApiKey(request.getApiKey());
        wallet.setPayOsChecksumKey(request.getChecksumKey());
        if (request.getActive() != null) {
            wallet.setPayOsStatus(request.getActive() ? "ACTIVE" : "INACTIVE");
        }
        wallet = clubWalletRepository.save(wallet);

        PayOS payOS = new PayOS(wallet.getPayOsClientId(), wallet.getPayOsApiKey(), wallet.getPayOsChecksumKey());
        try{
            payOS.webhooks().confirm(webhookUrl);
        } catch (Exception ex){
            log.error("[PayOS] Error confirming webhook via PayOS SDK: {}", ex.getMessage(), ex);
            throw new RuntimeException("PayOS webhook confirmation failed: " + ex.getMessage(), ex);
        }

        // Mask sensitive clientId before returning to client
        String maskedClientId = encryptionService.maskSensitiveData(wallet.getPayOsClientId());

        return PayOSConfigResponse.builder()
                .clubId(clubId)
                .clientId(maskedClientId)
                .active(wallet.getPayOsStatus() == null || wallet.getPayOsStatus().equalsIgnoreCase("ACTIVE"))
                .configured(true)
                .build();
    }






    public PayOSCreatePaymentResponse createPaymentRequest(Long clubId, PayOSCreatePaymentRequest request) throws AppException {
        // 🔹 Lấy thông tin ví của CLB
        ClubWallet wallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));

        if (wallet.getPayOsClientId() == null || wallet.getPayOsApiKey() == null || wallet.getPayOsChecksumKey() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Câu lạc bộ chưa cấu hình PayOS. Vui lòng liên hệ quản trị viên để cấu hình.");
        }
        PayOS payOS = new PayOS(wallet.getPayOsClientId(), wallet.getPayOsApiKey(), wallet.getPayOsChecksumKey());
        // 🔹 Tự sinh orderCode nếu chưa có (số nguyên dương duy nhất)
        // Nếu orderCode đã được set từ trước (như trong FeeService), giữ nguyên
        long orderCode = request.getOrderCode() != null ? request.getOrderCode() : System.currentTimeMillis();
        request.setOrderCode(orderCode);
        long expiredAt = Instant.now().plusSeconds(15 * 60).getEpochSecond();


        PaymentLinkItem item = PaymentLinkItem.builder()
                .name(request.getDescription())
                .quantity(1)
                .price(request.getAmount())
                .build();

        CreatePaymentLinkRequest sdkRequest = CreatePaymentLinkRequest.builder()
                .orderCode(orderCode)
                .amount(request.getAmount())
                .description(request.getDescription())
                .returnUrl(request.getReturnUrl())
                .cancelUrl(request.getCancelUrl())
                .item(item)
                .build();

        sdkRequest.setExpiredAt(expiredAt);



        CreatePaymentLinkResponse sdkResponse;
        try {
            sdkResponse = payOS.paymentRequests().create(sdkRequest);
        } catch (APIException e) {
            log.error("[PayOS] Lỗi tạo QR: code={}, desc={}", e.getErrorCode(), e.getErrorDesc().orElse(e.getMessage()));
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Tạo QR thất bại: " + e.getMessage());
        } catch (Exception e) {
            log.error("[PayOS] Exception tạo QR: {}", e.getMessage());
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Lỗi hệ thống");
        }


        PayOSCreatePaymentResponse response = new PayOSCreatePaymentResponse();
        response.setOrderCode(sdkResponse.getOrderCode());
        response.setPaymentLink(sdkResponse.getCheckoutUrl());
        response.setQrCode(sdkResponse.getQrCode());
        response.setRaw(Map.of("data", sdkResponse));

        log.info("[PayOS] Tạo QR one-time thành công: clubId={}, orderCode={}, qrCodeLength={}",
                clubId, orderCode, sdkResponse.getQrCode().length());
        return response;
    }



}
