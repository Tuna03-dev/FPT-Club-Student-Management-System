package com.sep490.backendclubmanagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class EventData {
    private Long id;
    private String title;
    private String description;
    private String location;
    private String startTime;
    private String endTime;
    private boolean isDraft;
    private Long clubId;
    private List<String> mediaUrls;

}
