package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CampusFilterRequest;
import com.sep490.backendclubmanagement.dto.response.CampusListResponse;
import com.sep490.backendclubmanagement.dto.response.CampusSummaryResponse;
import com.sep490.backendclubmanagement.dto.request.UpdateCampusRequest;
import com.sep490.backendclubmanagement.entity.Campus;
import com.sep490.backendclubmanagement.repository.CampusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CampusManagementService {

    private final CampusRepository campusRepository;

    public CampusListResponse getAllCampusesByFilter(CampusFilterRequest request) {
        Page<Campus> page = campusRepository.getAllByFilter(request, request.getPageable("id,desc"));
        List<CampusSummaryResponse> data = page.getContent().stream()
                .map(campus -> CampusSummaryResponse.builder()
                        .id(campus.getId())
                        .campusName(campus.getCampusName())
                        .campusCode(campus.getCampusCode())
                        .address(campus.getAddress())
                        .phone(campus.getPhone())
                        .email(campus.getEmail())
                        .build())
                .toList();

        return CampusListResponse.builder()
                .total(page.getTotalElements())
                .count(data.size())
                .data(data)
                .build();
    }

    @Transactional
    public CampusSummaryResponse updateCampus(Long campusId, UpdateCampusRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request không hợp lệ");
        }
        Campus campus = campusRepository.findById(campusId)
                .orElseThrow(() -> new IllegalArgumentException("Campus not found"));

        if (request.getCampusName() != null) {
            campus.setCampusName(request.getCampusName());
        }
        if (request.getCampusCode() != null) {
            campus.setCampusCode(request.getCampusCode());
        }
        if (request.getAddress() != null) {
            campus.setAddress(request.getAddress());
        }
        if (request.getPhone() != null) {
            campus.setPhone(request.getPhone());
        }
        if (request.getEmail() != null) {
            campus.setEmail(request.getEmail());
        }

        campusRepository.save(campus);

        return CampusSummaryResponse.builder()
                .id(campus.getId())
                .campusName(campus.getCampusName())
                .campusCode(campus.getCampusCode())
                .address(campus.getAddress())
                .phone(campus.getPhone())
                .email(campus.getEmail())
                .build();
    }
}


