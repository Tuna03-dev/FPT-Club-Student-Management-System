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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;

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

    private static final String PAYOS_PAYMENT_REQUEST_ENDPOINT = "https://api-merchant.payos.vn/v2/payment-requests";

    @Transactional(readOnly = true)
    public PayOSConfigResponse getConfig(Long clubId) throws AppException {
        ClubWallet wallet = clubWalletRepository.findByClub_Id(clubId).orElse(null);
        boolean configured = wallet != null && wallet.getPayOsClientId() != null && !wallet.getPayOsClientId().isBlank();
        boolean active = configured && (wallet.getPayOsStatus() == null || wallet.getPayOsStatus().equalsIgnoreCase("ACTIVE"));
        return PayOSConfigResponse.builder()
                .clubId(clubId)
                .clientId(wallet != null ? wallet.getPayOsClientId() : null)
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
        return PayOSConfigResponse.builder()
                .clubId(clubId)
                .clientId(wallet.getPayOsClientId())
                .active(wallet.getPayOsStatus() == null || wallet.getPayOsStatus().equalsIgnoreCase("ACTIVE"))
                .configured(true)
                .build();
    }

    @Transactional(readOnly = true)
    public PayOSTestConnectionResponse testConnection(Long clubId) throws AppException {
        ClubWallet wallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));

        if (wallet.getPayOsClientId() == null || wallet.getPayOsApiKey() == null || wallet.getPayOsChecksumKey() == null) {
            return PayOSTestConnectionResponse.builder()
                    .connected(false)
                    .message("Thiếu Client ID/API Key/Checksum Key")
                    .build();
        }

        // TODO: Optionally call PayOS sandbox API here; for now, validate presence only
        boolean active = wallet.getPayOsStatus() == null || wallet.getPayOsStatus().equalsIgnoreCase("ACTIVE");
        return PayOSTestConnectionResponse.builder()
                .connected(active)
                .message(active ? "Kết nối hợp lệ (đã cấu hình)" : "Cấu hình ở trạng thái INACTIVE")
                .build();
    }

    @Transactional(readOnly = true)
    public List<RecentPaymentResponse> getRecentPayments(Long clubId) throws AppException {
        // Verify club exists
        clubRepository.findById(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));

        List<PayOSPayment> payments = payOSPaymentRepository.findTop10RecentPaymentsByClubId(clubId);
        
        return payments.stream()
                .map(payment -> RecentPaymentResponse.builder()
                        .id(payment.getId())
                        .transactionCode(payment.getTransactionCode())
                        .orderCode(payment.getOrderCode())
                        .amount(payment.getAmount())
                        .description(payment.getDescription())
                        .paymentMethod(payment.getPaymentMethod())
                        .paymentStatus(payment.getPaymentStatus() != null ? payment.getPaymentStatus().name() : null)
                        .success(payment.getSuccess())
                        .paymentTime(payment.getPaymentTime())
                        .transactionDateTime(payment.getTransactionDateTime())
                        .counterAccountName(payment.getCounterAccountName())
                        .counterAccountBankName(payment.getCounterAccountBankName())
                        .reference(payment.getReference())
                        .build())
                .collect(Collectors.toList());
    }

    public PayOSCreatePaymentResponse createPaymentRequest(Long clubId, PayOSCreatePaymentRequest request) throws AppException {
        // 🔹 Lấy thông tin ví của CLB
        ClubWallet wallet = clubWalletRepository.findByClub_Id(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.CLUB_NOT_FOUND));

        if (wallet.getPayOsClientId() == null || wallet.getPayOsApiKey() == null || wallet.getPayOsChecksumKey() == null) {
            throw new RuntimeException("Thiếu cấu hình PayOS (ClientID/API Key/Checksum Key)");
        }

        // 🔹 Tự sinh orderCode (số nguyên dương duy nhất)
        long orderCode = System.currentTimeMillis();
        request.setOrderCode(orderCode);

        // 🔹 Tạo chữ ký signature hợp lệ theo PayOS docs
        String signature = generateSignature(
                wallet.getPayOsChecksumKey(),
                request.getAmount(),
                request.getCancelUrl(),
                request.getDescription(),
                orderCode,
                request.getReturnUrl()
        );
        request.setSignature(signature);

        // 🔹 Tạo RestTemplate và headers
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.add("x-client-id", wallet.getPayOsClientId());
        headers.add("x-api-key", wallet.getPayOsApiKey());
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 🔹 Gửi request tới PayOS
        HttpEntity<PayOSCreatePaymentRequest> entity = new HttpEntity<>(request, headers);
        ResponseEntity<HashMap> responseEntity = restTemplate.exchange(
                PAYOS_PAYMENT_REQUEST_ENDPOINT,
                HttpMethod.POST,
                entity,
                HashMap.class
        );

        // 🔹 Xử lý phản hồi
        HashMap result = responseEntity.getBody();
        PayOSCreatePaymentResponse response = new PayOSCreatePaymentResponse();

        if (result != null) {
            Object data = result.get("data");
            if (data instanceof Map dataMap) {
                response.setOrderCode((Long) dataMap.getOrDefault("orderCode", null));
                response.setPaymentLink((String) dataMap.getOrDefault("checkoutUrl", null));
                response.setQrCode((String) dataMap.getOrDefault("qrCode", null));
                response.setRaw(dataMap);
            } else {
                response.setRaw(result);
            }
        }

        log.info("PayOS create payment result: {}", result);
        return response;
    }

    private String generateSignature(String checksumKey, long amount, String cancelUrl,
                                     String description, long orderCode, String returnUrl) {
        try {
            String data = String.format(
                    "amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                    amount, cancelUrl, description, orderCode, returnUrl
            );

            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(checksumKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secretKeySpec);

            byte[] hashBytes = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo signature PayOS", e);
        }
    }

}


