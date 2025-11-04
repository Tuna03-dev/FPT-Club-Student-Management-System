package com.sep490.backendclubmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateReportRequest {
    
    @NotBlank(message = "Report title is required")
    private String reportTitle;
    
    private String content;
    
    private String fileUrl;
    
    @NotNull(message = "Club ID is required")
    private Long clubId;
    
    @NotNull(message = "Report requirement ID is required")
    private Long reportRequirementId;
}

