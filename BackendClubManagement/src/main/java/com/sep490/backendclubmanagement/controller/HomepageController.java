// Trong: controller/HomepageController.java
package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse; // <-- 1. IMPORT LỚP APIRESPONSE
import com.sep490.backendclubmanagement.dto.response.HomepageResponse;
import com.sep490.backendclubmanagement.service.HomepageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/homepage") // Giữ nguyên prefix
@RequiredArgsConstructor
public class HomepageController {

    private final HomepageService homepageService;

    @GetMapping
    // 2. Sửa kiểu trả về của phương thức
    public ResponseEntity<ApiResponse<HomepageResponse>> getHomepageData() {
        // Lấy dữ liệu từ service như bình thường
        HomepageResponse data = homepageService.getHomepageData();

        // 3. Dùng phương thức static `success` để gói dữ liệu lại
        // và trả về trong ResponseEntity
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}