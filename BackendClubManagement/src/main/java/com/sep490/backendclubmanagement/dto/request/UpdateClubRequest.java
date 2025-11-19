package com.sep490.backendclubmanagement.dto.request;

import lombok.Data;

@Data
public class UpdateClubRequest {

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

    private Long campusId;

    private Long categoryId;
}

