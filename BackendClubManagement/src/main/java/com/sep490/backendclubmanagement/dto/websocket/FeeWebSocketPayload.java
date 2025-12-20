package com.sep490.backendclubmanagement.dto.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeWebSocketPayload {
    private Long feeId;
    private String title;
    private String description;
    private BigDecimal amount;
    private Boolean isMandatory;
    private LocalDate dueDate;
    private Long clubId;
    private String clubName;
    private String feeType;
    private String message;
}

