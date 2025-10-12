package com.sep490.backendclubmanagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.mapstruct.Builder;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NewsData {
    private Long id;
    private String title;
    private String content;
    private String thumbnailUrl;
    private String newsType;
    private boolean isDraft;
    private Long clubId;
}
