package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.ClubCategoryFilterRequest;
import com.sep490.backendclubmanagement.dto.request.CreateClubCategoryRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateClubCategoryRequest;
import com.sep490.backendclubmanagement.dto.response.ClubCategoryDTO;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.service.ClubCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/club-categories")
@RequiredArgsConstructor
public class ClubCategoryController {

    private final ClubCategoryService clubCategoryService;

    /**
     * Lấy tất cả thể loại câu lạc bộ (không phân trang) - Public
     */
    @GetMapping
    public ApiResponse<List<ClubCategoryDTO>> getAllClubCategories() {
        List<ClubCategoryDTO> data = clubCategoryService.getAllClubCategories();
        return ApiResponse.success(data);
    }

    /**
     * Lấy danh sách thể loại câu lạc bộ có tìm kiếm và phân trang - Staff Only
     */
    @GetMapping("/staff/filter")
    public ApiResponse<PageResponse<ClubCategoryDTO>> getAllClubCategoriesWithFilter(
            @ModelAttribute ClubCategoryFilterRequest request) throws AppException {
        PageResponse<ClubCategoryDTO> data = clubCategoryService.getAllClubCategoriesWithFilter(request);
        return ApiResponse.success(data);
    }

    /**
     * Lấy thông tin chi tiết một thể loại câu lạc bộ - Staff Only
     */
    @GetMapping("/staff/{id}")
    public ApiResponse<ClubCategoryDTO> getClubCategoryById(@PathVariable Long id) throws AppException {
        ClubCategoryDTO data = clubCategoryService.getClubCategoryById(id);
        return ApiResponse.success(data);
    }

    /**
     * Tạo mới thể loại câu lạc bộ - Staff Only
     */
    @PostMapping("/staff")
    public ApiResponse<ClubCategoryDTO> createClubCategory(
            @Valid @RequestBody CreateClubCategoryRequest request) throws AppException {
        ClubCategoryDTO data = clubCategoryService.createClubCategory(request);
        return ApiResponse.success(data);
    }

    /**
     * Cập nhật thể loại câu lạc bộ - Staff Only
     */
    @PutMapping("/staff/{id}")
    public ApiResponse<ClubCategoryDTO> updateClubCategory(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClubCategoryRequest request) throws AppException {
        ClubCategoryDTO data = clubCategoryService.updateClubCategory(id, request);
        return ApiResponse.success(data);
    }

    /**
     * Xóa thể loại câu lạc bộ - Staff Only
     */
    @DeleteMapping("/staff/{id}")
    public ApiResponse<Void> deleteClubCategory(@PathVariable Long id) throws AppException {
        clubCategoryService.deleteClubCategory(id);
        return ApiResponse.success(null);
    }
}
