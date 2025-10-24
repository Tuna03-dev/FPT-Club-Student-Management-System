package com.sep490.backendclubmanagement.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubDetailData {
    private Long id;
    private String clubName;
    private String clubCode;
    private String description;
    private String logoUrl;
    private String bannerUrl;
    private String email;
    private String phone;
    private String fbUrl;
    private String igUrl;
    private String ttUrl;
    private String ytUrl;
    private String status;
    
    // Campus info
    private Long campusId;
    private String campusName;
    private String campusCode;
    
    // Category info
    private Long categoryId;
    private String categoryName;
    
    // Statistics
    private Long totalMembers;
    private Long totalEvents;
    private Long totalPosts;
    
    // President info
    private ClubPresidentData president;
    
    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;


}

