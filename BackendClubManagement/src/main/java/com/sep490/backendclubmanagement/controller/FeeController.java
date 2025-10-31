package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.CreateFeeRequest;
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
}

