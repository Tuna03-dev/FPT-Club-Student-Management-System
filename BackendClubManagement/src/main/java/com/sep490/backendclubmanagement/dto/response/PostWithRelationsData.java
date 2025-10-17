package com.sep490.backendclubmanagement.dto.response;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PostWithRelationsData {
    private Long id;
    private String title;
    private String content;
    private String status;
    private boolean withinClub;
    private boolean clubWide;
    private LocalDateTime createdAt;

    private  Long teamId;
    private  String teamName;
    private Long clubId;
    private String clubName;
    private Long authorId;
    private String authorName;

    private List<CommentData> comments;
    private List<LikeData> likes;
    private List<PostMediaData> media;
}
