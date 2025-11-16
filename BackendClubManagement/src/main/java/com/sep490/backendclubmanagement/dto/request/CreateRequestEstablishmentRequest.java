package com.sep490.backendclubmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRequestEstablishmentRequest {

    @NotBlank(message = "Tên CLB không được để trống")
    private String clubName;

    @NotBlank(message = "Danh mục CLB không được để trống")
    private String clubCategory;

    @NotNull(message = "Số lượng thành viên dự kiến không được để trống")
    @Positive(message = "Số lượng thành viên phải lớn hơn 0")
    private Integer expectedMemberCount;

    private String activityObjectives; // Mục tiêu hoạt động

    private String expectedActivities; // Hoạt động dự kiến

    private String description; // Mô tả CLB

    // true = lưu bản nháp (DRAFT), false = gửi yêu cầu (SUBMITTED)
    private Boolean isDraft = true;
}



