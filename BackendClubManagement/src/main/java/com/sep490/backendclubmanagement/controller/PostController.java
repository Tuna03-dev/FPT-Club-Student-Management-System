package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.response.PostWithRelationsData;
import com.sep490.backendclubmanagement.dto.response.PostWithRelationsData;
import com.sep490.backendclubmanagement.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    // 1) Bài toàn CLB (club-wide)
    // GET /posts/{clubId}/club-wide?Pageable...
    @GetMapping("/{clubId}/club-wide")
    public ResponseEntity<ApiResponse<Page<PostWithRelationsData>>> getClubWidePosts(
            @PathVariable Long clubId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<PostWithRelationsData> data = postService.getClubWidePosts(clubId, pageable);

        return ResponseEntity.ok(
                ApiResponse.<Page<PostWithRelationsData>>builder()
                        .code(200).message("OK")
                        .timestamp(Instant.now())
                        .data(data)
                        .build()
        );
    }

    // 2) Bài theo team trong CLB
    // GET /posts/{clubId}/teams/{teamId}?Pageable...
    @GetMapping("/{clubId}/teams/{teamId}")
    public ResponseEntity<ApiResponse<Page<PostWithRelationsData>>> getTeamPosts(
            @PathVariable Long clubId,
            @PathVariable Long teamId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<PostWithRelationsData> data = postService.getTeamPosts(clubId, teamId, pageable);

        return ResponseEntity.ok(
                ApiResponse.<Page<PostWithRelationsData>>builder()
                        .code(200).message("OK")
                        .timestamp(Instant.now())
                        .data(data)
                        .build()
        );
    }

    // --- (Tuỳ chọn) Compatibility endpoint: vẫn giữ /posts/{clubId}?clubWide=1|0&teamId=... ---
    // Logic:
    // - clubWide=1 => trả bài toàn CLB
    // - clubWide=0 + teamId != null => trả bài team
//    @GetMapping("/{clubId}")
//    public ResponseEntity<ApiResponse<Page<PostWithRelationsData>>> getPostsByClubCompat(
//            @PathVariable Long clubId,
//            @RequestParam(defaultValue = "1") int clubWide,
//            @RequestParam(required = false) Long teamId,
//            @RequestParam(defaultValue = "0") int page,
//            @RequestParam(defaultValue = "5") int size,
//            @RequestParam(defaultValue = "createdAt,desc") String sort
//    ) {
//        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
//        Page<PostWithRelationsData> data;
//
//        if (clubWide == 1) {
//            data = postService.getClubWidePosts(clubId, pageable);
//        } else {
//            if (teamId == null) {
//                // Có thể trả 400 hoặc mặc định trả empty
//                data = Page.empty(pageable);
//            } else {
//                data = postService.getTeamPosts(clubId, teamId, pageable);
//            }
//        }
//
//        return ResponseEntity.ok(
//                ApiResponse.<Page<PostWithRelationsData>>builder()
//                        .code(200).message("OK")
//                        .timestamp(Instant.now())
//                        .data(data)
//                        .build()
//        );
//    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String prop = parts.length > 0 ? parts[0] : "createdAt";
        Sort.Direction dir = (parts.length > 1 && parts[1].equalsIgnoreCase("asc"))
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, prop);
    }
}

