package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.CreatePostRequest;
import com.sep490.backendclubmanagement.dto.request.UpdatePostRequest;
import com.sep490.backendclubmanagement.dto.response.PostWithRelationsData;
import com.sep490.backendclubmanagement.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final ObjectMapper objectMapper;

    // 1) Bài toàn CLB (club-wide)
    // GET /posts/{clubId}/club-wide?Pageable...
    @GetMapping("/{clubId}/club-wide")
    public ApiResponse<Page<PostWithRelationsData>> getClubWidePosts(
            @PathVariable Long clubId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<PostWithRelationsData> data = postService.getClubWidePosts(clubId, pageable);
        return ApiResponse.success(data);
    }

    // 2) Bài theo team trong CLB
    // GET /posts/{clubId}/teams/{teamId}?Pageable...
    @GetMapping("/{clubId}/teams/{teamId}")
    public ApiResponse<Page<PostWithRelationsData>> getTeamPosts(
            @PathVariable Long clubId,
            @PathVariable Long teamId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<PostWithRelationsData> data = postService.getTeamPosts(clubId, teamId, pageable);
        return ApiResponse.success(data);
    }

    // 3) Search post theo từ khóa trong title/content (dùng để share theo chủ đề)
    // GET /posts/search?q=keyword&clubId=1&teamId=2&clubWide=true&page=0&size=10&sort=createdAt,desc
    // /posts/search?q=nhạc&clubId=2
    @GetMapping("/search")
    public ApiResponse<Page<PostWithRelationsData>> searchPosts(
            @RequestParam String q,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false) Boolean clubWide,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<PostWithRelationsData> data = postService.searchPosts(clubId, teamId, clubWide, q, pageable);
        return ApiResponse.success(data);
    }
//    @PostMapping
//    public ApiResponse<PostWithRelationsData> createPost(@Valid @RequestBody CreatePostRequest req) {
//        // TODO: lấy authorId từ SecurityContext nếu có
//        Long authorId = null; // hoặc lấy từ JWT/user session
//        PostWithRelationsData data = postService.createPost(req, authorId);
//        return ApiResponse.success(data);
//    }
//@PostMapping(path = "/create/with-media", consumes = "multipart/form-data")
//public ApiResponse<PostWithRelationsData> createPostWithMedia(
//        @RequestPart("request") @Valid CreatePostRequest req,
//        @RequestPart(value = "files", required = false) List<MultipartFile> files
//) {
//    Long authorId = SecurityUtils.currentUserId();
//    return ApiResponse.success(postService.createPostWithUploads(req, files, authorId));
//}
@PostMapping(path = "/create/with-media", consumes = "multipart/form-data")
public ApiResponse<PostWithRelationsData> createPostWithMedia(
        @RequestPart("request") String reqJson,                    // 👈 nhận String
        @RequestPart(value = "files", required = false) List<MultipartFile> files
) throws Exception {
    CreatePostRequest req = objectMapper.readValue(reqJson, CreatePostRequest.class); // 👈 tự parse
    Long authorId = null;
    return ApiResponse.success(postService.createPostWithUploads(req, files, authorId));
}
//    @PutMapping(path = "/update/{postId}", consumes = "multipart/form-data")
//    public ApiResponse<PostWithRelationsData> updatePost(
//            @PathVariable Long postId,
//            @RequestPart("request") @Valid UpdatePostRequest req,
//            @RequestPart(value = "files", required = false) List<MultipartFile> files
//    ) {
//        Long authorId = SecurityUtils.currentUserId();
//        var data = postService.updatePostWithUploads(postId, req, files, authorId);
//        return ApiResponse.success(data);
//    }
@PutMapping(path = "/update/{postId}", consumes = "multipart/form-data")
public ApiResponse<PostWithRelationsData> updatePost(
        @PathVariable Long postId,
        @RequestPart("request") String reqJson, // đổi sang String
        @RequestPart(value = "files", required = false) List<MultipartFile> files
) throws Exception {
    UpdatePostRequest req = objectMapper.readValue(reqJson, UpdatePostRequest.class);
    Long authorId = null;
    var data = postService.updatePostWithUploads(postId, req, files, authorId);
    return ApiResponse.success(data);
}

    @DeleteMapping("/delete/{postId}")
    public ApiResponse<Void> deletePost(@PathVariable Long postId) {
        postService.deletePost(postId);
        return ApiResponse.success(null);
    }
    @DeleteMapping("/delete/{postId}/media/{mediaId}")
    public ApiResponse<PostWithRelationsData> deleteOneMedia(
            @PathVariable Long postId,
            @PathVariable Long mediaId
    ) {
        var data = postService.deleteOneMedia(postId, mediaId);
        return ApiResponse.success(data);
    }

// @PostMapping(
//    path = "/with-media",
//    consumes = MediaType.APPLICATION_JSON_VALUE,
//    produces = MediaType.APPLICATION_JSON_VALUE
//)
//public ApiResponse<PostWithRelationsData> createPostJson(
//        @RequestBody @Valid CreatePostRequest req
//) {
//    Long authorId = null;
//    // vì nhận JSON nên không có files -> truyền null
//    return ApiResponse.success(postService.createPostWithUploads(req, null, authorId));
//}


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

