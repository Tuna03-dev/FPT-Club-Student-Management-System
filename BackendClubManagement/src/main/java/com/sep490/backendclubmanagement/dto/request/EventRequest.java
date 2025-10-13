package com.sep490.backendclubmanagement.dto.request;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EventRequest extends PageableRequest {
    private Long eventTypeId;
    private Long clubId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
