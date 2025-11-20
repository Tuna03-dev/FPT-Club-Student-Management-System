package com.sep490.backendclubmanagement.dto.request;

import lombok.Data;

@Data
public class UpdateClubRequest {

    private String clubName;

    private String clubCode;

    private String description;

    private String status;

    private Long campusId;

    private Long categoryId;
}

