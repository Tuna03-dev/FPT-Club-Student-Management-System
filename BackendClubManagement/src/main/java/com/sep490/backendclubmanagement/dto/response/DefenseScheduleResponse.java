package com.sep490.backendclubmanagement.dto.response;

import com.sep490.backendclubmanagement.entity.DefenseScheduleStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DefenseScheduleResponse {
    private Long id;
    private LocalDateTime defenseDate;
    private String location;
    private String meetingLink;
    private String panelMembers;
    private String notes;
    private DefenseScheduleStatus result; // PASSED, FAILED, PENDING
    private String feedback;
    private String fapBookingId;
    private Boolean isAutoBooked;
    private String fapBookingStatus;
    private String fapBookingLink;
    private Long requestEstablishmentId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

