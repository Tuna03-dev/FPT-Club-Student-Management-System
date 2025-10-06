package com.sep490.backendclubmanagement.entity;

public enum RequestEstablishmentStatus {
    DRAFT,          // Bản nháp
    SUBMITTED,      // Đã gửi
    INITIAL_REVIEW,   // Đang xem xét
    PROPOSAL_REQUIRED,       // Yêu cầu đề án
    PROPOSAL_SUBMITTED,
    PROPOSAL_APPROVED,      // Đề án được chấp thuận
    DEFENSE_SCHEDULED,      // Lịch bảo vệ đã được lên lịch
    DEFENSE_COMPLETED,      // Bảo vệ đã hoàn thành
    APPROVED,
    REJECTED        // Bị từ chối
}

