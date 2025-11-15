package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.response.ClubCategoryDTO;
import com.sep490.backendclubmanagement.service.ClubCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/club-categories")
@RequiredArgsConstructor
public class ClubCategoryController {

    private final ClubCategoryService clubCategoryService;

    @GetMapping
    public ApiResponse<List<ClubCategoryDTO>> getAllClubCategories() {
        List<ClubCategoryDTO> data = clubCategoryService.getAllClubCategories();
        return ApiResponse.success(data);
    }
}
