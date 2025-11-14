package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.CreatePostRequest;
import com.sep490.backendclubmanagement.dto.request.UpdatePostRequest;
import com.sep490.backendclubmanagement.dto.response.PostWithRelationsData;
import com.sep490.backendclubmanagement.entity.Post;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.repository.PostRepository;
import com.sep490.backendclubmanagement.service.PostService;
import com.sep490.backendclubmanagement.service.UserService;
import com.sep490.backendclubmanagement.util.PostStatus;
import jakarta.persistence.EntityManager;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
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
    private final PostRepository postRepository;
    private final PostService postService;
    private final ObjectMapper objectMapper;
    private final UserService userService;
    private final EntityManager entityManager;


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
    // GET /api/posts/{clubId}/feed?page=0&size=10&sort=createdAt,desc
    @GetMapping("/{clubId}/feed")
    public ApiResponse<Page<PostWithRelationsData>> getClubFeed(
            @PathVariable Long clubId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) throws Exception {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Long userId = userService.getCurrentUserId();
        Page<PostWithRelationsData> data = postService.getClubFeed(clubId, userId, pageable);
        return ApiResponse.success(data);
    }

@PostMapping(path = "/create/with-media", consumes = "multipart/form-data")
public ApiResponse<PostWithRelationsData> createPostWithMedia(
        @RequestPart("request") String reqJson,                    // 👈 nhận String
        @RequestPart(value = "files", required = false) List<MultipartFile> files
) throws Exception {
    CreatePostRequest req = objectMapper.readValue(reqJson, CreatePostRequest.class); // 👈 tự parse
    Long authorId = userService.getCurrentUserId();
    return ApiResponse.success(postService.createPostWithUploads(req, files, authorId));
}

@PutMapping(path = "/update/{postId}", consumes = "multipart/form-data")
public ApiResponse<PostWithRelationsData> updatePost(
        @PathVariable Long postId,
        @RequestPart("request") String reqJson, // đổi sang String
        @RequestPart(value = "files", required = false) List<MultipartFile> files
) throws Exception {
    UpdatePostRequest req = objectMapper.readValue(reqJson, UpdatePostRequest.class);
    Long authorId = userService.getCurrentUserId();
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


    @PostMapping("/{postId}/approve")
    public ApiResponse<Void> approve(@PathVariable Long postId) throws AppException {
        Long approverId = userService.getCurrentUserId();
        Post p = postRepository.findById(postId).orElseThrow();

        if (!postService.canApprove(approverId, p)) {
            throw new IllegalArgumentException("Bạn không có quyền duyệt bài này");
        }

        p.setStatus(PostStatus.PUBLISHED);
        p.setApprovedBy(entityManager.getReference(com.sep490.backendclubmanagement.entity.User.class, approverId));
        p.setApprovedAt(java.time.LocalDateTime.now());

        // Clear các dấu vết reject cũ (nếu có)
        p.setRejectedBy(null);
        p.setRejectedAt(null);

        postRepository.save(p);
        return ApiResponse.success(null);
    }
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    static class RejectRequest {        // 👈 DTO nhỏ gọn cho body từ chối
        private String reason;
    }
    @PostMapping("/{postId}/reject")
    public ApiResponse<Void> reject(@PathVariable Long postId, @RequestBody(required = false) RejectRequest body) throws AppException {
        Long approverId = userService.getCurrentUserId();
        Post p = postRepository.findById(postId).orElseThrow();

        if (!postService.canApprove(approverId, p)) {
            throw new IllegalArgumentException("Bạn không có quyền từ chối bài này");
        }

        p.setStatus(PostStatus.REJECTED);
        p.setRejectedBy(entityManager.getReference(com.sep490.backendclubmanagement.entity.User.class, approverId));
        p.setRejectedAt(java.time.LocalDateTime.now());

        // Nếu bạn đã thêm cột rejectReason:
        String reason = (body != null) ? body.getReason() : null;
        try {
            p.getClass().getDeclaredField("rejectReason");
            p.setRejectReason((reason != null && !reason.isBlank()) ? reason : null);
        } catch (NoSuchFieldException ignored) {}

        // Nếu đã bị từ chối, clear dấu vết "approved" cũ (tránh thông tin mâu thuẫn)
        p.setApprovedBy(null);
        p.setApprovedAt(null);

        postRepository.save(p);
        return ApiResponse.success(null);
    }





    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String prop = parts.length > 0 ? parts[0] : "createdAt";
        Sort.Direction dir = (parts.length > 1 && parts[1].equalsIgnoreCase("asc"))
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, prop);
    }
}

