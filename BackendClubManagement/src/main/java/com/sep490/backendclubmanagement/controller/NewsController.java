package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.NewsRequest;
import com.sep490.backendclubmanagement.dto.response.NewsData;
import com.sep490.backendclubmanagement.dto.response.NewsResponse;
import com.sep490.backendclubmanagement.service.NewsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/news")
@RequiredArgsConstructor
public class NewsController {
    private final NewsService newsService;

    @PostMapping("/get-all-by-filter")
    public ApiResponse<NewsResponse> getAllEventsByFilter(@RequestBody NewsRequest request) {
          return ApiResponse.success(newsService.getAllNewsByFilter(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<NewsData> getNewsById(@PathVariable Long id) {
        return ApiResponse.success(newsService.getNewsById(id));
    }
}
