package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.response.ClubDetailData;
import com.sep490.backendclubmanagement.dto.response.ClubDto;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.service.ClubServiceInterface;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clubs")
@RequiredArgsConstructor
public class ClubController {

    private final ClubServiceInterface clubService;

    /**
     * Get club detail by ID
     * @param id Club ID
     * @return Club detail data
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClubDetailData>> getClubDetail(@PathVariable Long id) throws AppException {
        ClubDetailData data = clubService.getClubDetail(id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * Get club detail by club code
     * @param clubCode Club code
     * @return Club detail data
     */
    @GetMapping("/code/{clubCode}")
    public ResponseEntity<ApiResponse<ClubDetailData>> getClubDetailByCode(@PathVariable String clubCode) throws AppException {
        ClubDetailData data = clubService.getClubDetailByCode(clubCode);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * Get all clubs (id and name only)
     * @return List of clubs with id and clubName
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ClubDto>>> getAllClubs() {
        List<ClubDto> clubs = clubService.getAllClubs();
        return ResponseEntity.ok(ApiResponse.success(clubs));
    }
}

