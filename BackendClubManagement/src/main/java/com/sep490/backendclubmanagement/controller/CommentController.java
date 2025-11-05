// src/main/java/com/sep490/backendclubmanagement/controller/CommentController.java
package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.CreateCommentRequest;
import com.sep490.backendclubmanagement.dto.request.EditCommentRequest;
import com.sep490.backendclubmanagement.dto.response.CommentDTO;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.service.ICommentService;
import com.sep490.backendclubmanagement.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final ICommentService commentService;
    private final UserService userService;


    /** Tạo comment hoặc reply */
    @PostMapping(
            path = "/posts/{postId}",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ApiResponse<CommentDTO> createJson(
            @PathVariable Long postId,
            @RequestBody CreateCommentRequest req) {
        return ApiResponse.success(commentService.create(postId, req.getUserId(), req.getContent(), req.getParentId()));
    }
    // tất cả comment
    @GetMapping("/posts/{postId}/comments")
    public ApiResponse<List<CommentDTO>> getAllFlat(@PathVariable Long postId) {
        return ApiResponse.success(commentService.getAllFlat(postId));
    }

    /** Lấy danh sách comments cha của post (phân trang page/size) */
    @GetMapping("/posts/{postId}")
    public ApiResponse<List<CommentDTO>> listTopLevel(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ){
        return ApiResponse.success(commentService.listTopLevel(postId, page, size));
    }

    /** Lấy replies của một comment cha */
    @GetMapping("/{parentId}/replies")
    public ApiResponse<List<CommentDTO>> listReplies(@PathVariable Long parentId){
        return ApiResponse.success(commentService.listReplies(parentId));
    }

    /** Sửa comment */
    @PatchMapping(path = "/{commentId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<CommentDTO> edit(
            @PathVariable Long commentId,
            @RequestBody EditCommentRequest req
    ) throws AppException {                           // 👈 thêm throws
        Long currentUserId = userService.getCurrentUserId();
        return ApiResponse.success(commentService.edit(commentId, currentUserId, req.getContent()));
    }
    /** Xóa mềm comment (giữ thread, hiển thị “(đã xoá)”) */
    @DeleteMapping("/{commentId}")
    public ApiResponse<Void> delete(@PathVariable Long commentId) throws AppException {
        Long currentUserId = userService.getCurrentUserId(); // có thể ném AppException
        commentService.softDelete(commentId, currentUserId);
        return ApiResponse.success(null);
    }
}
