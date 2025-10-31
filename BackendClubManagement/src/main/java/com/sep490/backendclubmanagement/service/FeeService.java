package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateFeeRequest;
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
}

