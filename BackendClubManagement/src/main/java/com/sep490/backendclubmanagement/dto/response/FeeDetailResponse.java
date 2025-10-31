package com.sep490.backendclubmanagement.dto.response;

import com.sep490.backendclubmanagement.entity.FeeType;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class FeeDetailResponse {
    private Long id;
    private String title;
    private String description;
    private BigDecimal amount;
    private FeeType feeType;
    private LocalDate dueDate;
    private Boolean isMandatory;
    private Integer paidMembers;
    private Integer totalMembers;
}
