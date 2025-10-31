package com.sep490.backendclubmanagement.dto.request;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateCommentRequest {
    private Long userId;
    private String content;
    private Long parentId; // null nếu top-level
}
