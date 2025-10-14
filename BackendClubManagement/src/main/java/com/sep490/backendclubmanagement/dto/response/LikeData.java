package com.sep490.backendclubmanagement.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LikeResponse {
    private Long id;
    private Long userId;
    private String userName;
    private LocalDateTime createdAt;
}
