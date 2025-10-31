package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.CreateFeeRequest;
import com.sep490.backendclubmanagement.dto.request.LockFeeRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateFeeRequest;
import com.sep490.backendclubmanagement.dto.response.FeeDetailResponse;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.service.FeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clubs/{clubId}/fees")
@RequiredArgsConstructor
public class FeeController {
    private final FeeService feeService;

    @GetMapping
    public ApiResponse<List<FeeDetailResponse>> getFees(@PathVariable Long clubId) {
        List<FeeDetailResponse> responses = feeService.getFeesByClubId(clubId);
        return ApiResponse.success(responses);
    }

    @GetMapping("/check-title")
    public ApiResponse<Boolean> checkFeeTitleExists(
            @PathVariable Long clubId,
            @RequestParam String title,
            @RequestParam(required = false) Long excludeFeeId
    ) {
        boolean exists;
        if (excludeFeeId != null) {
            exists = feeService.isFeeTitleExistsExcluding(clubId, title, excludeFeeId);
        } else {
            exists = feeService.isFeeTitleExists(clubId, title);
        }
        return ApiResponse.success(exists);
    }

    @PostMapping
    public ApiResponse<FeeDetailResponse> createFee(
            @PathVariable Long clubId,
            @Valid @RequestBody CreateFeeRequest request) {
        try {
            FeeDetailResponse feeDto = feeService.createFee(clubId, request);
            return ApiResponse.success(feeDto);
        } catch (AppException ex) {
            return ApiResponse.error(ex.getErrorCode(), ex.getMessage(), null);
        }
    }

    @PutMapping("/{feeId}")
    public ApiResponse<FeeDetailResponse> updateFee(
            @PathVariable Long clubId,
            @PathVariable Long feeId,
            @Valid @RequestBody UpdateFeeRequest request) {
        try {
            FeeDetailResponse feeDto = feeService.updateFee(feeId, request);
            return ApiResponse.success(feeDto);
        } catch (AppException ex) {
            return ApiResponse.error(ex.getErrorCode(), ex.getMessage(), null);
        }
    }

    @DeleteMapping("/{feeId}")
    public ApiResponse<Void> deleteFee(
            @PathVariable Long clubId,
            @PathVariable Long feeId) {
        try {
            feeService.deleteFee(feeId);
            return ApiResponse.success(null);
        } catch (AppException ex) {
            return ApiResponse.error(ex.getErrorCode(), ex.getMessage(), null);
        }
    }

    @PatchMapping("/{feeId}/lock")
    public ApiResponse<FeeDetailResponse> lockFee(
            @PathVariable Long clubId,
            @PathVariable Long feeId,
            @RequestBody LockFeeRequest body
    ) {
        try {
            FeeDetailResponse feeDto = feeService.lockFee(feeId, body.isLocked());
            return ApiResponse.success(feeDto);
        } catch (AppException ex) {
            return ApiResponse.error(ex.getErrorCode(), ex.getMessage(), null);
        }
    }
}

