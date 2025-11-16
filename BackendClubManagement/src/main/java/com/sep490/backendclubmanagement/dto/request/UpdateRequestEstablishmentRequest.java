package com.sep490.backendclubmanagement.dto.request;

import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateRequestEstablishmentRequest {

    private String clubName;

    private String clubCategory;

    @Positive(message = "Số lượng thành viên phải lớn hơn 0")
    private Integer expectedMemberCount;

    private String activityObjectives; // Mục tiêu hoạt động

    private String expectedActivities; // Hoạt động dự kiến

    private String description; // Mô tả CLB
}



