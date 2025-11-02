package com.sep490.backendclubmanagement.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PayOSConfigResponse {
    private Long clubId;
    private String clientId;
    private boolean active;
    private boolean configured;
}



