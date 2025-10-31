package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateFeeRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateFeeRequest;
import com.sep490.backendclubmanagement.dto.response.FeeDetailResponse;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.FeeMapper;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.FeeRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeeService {
    private final FeeRepository feeRepository;
    private final ClubRepository clubRepository;
    private final FeeMapper feeMapper;

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

                    int totalMembers = 0;


                    feeDetailResponse.setPaidMembers(paidMembers);
                    feeDetailResponse.setTotalMembers(totalMembers);

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
}

