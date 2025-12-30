package com.sep490.backendclubmanagement.exception;

import com.sep490.backendclubmanagement.dto.response.ImportMemberError;
import lombok.Getter;

import java.util.List;

@Getter
public class AppException extends RuntimeException {
    private final ErrorCode errorCode;
    private List<ImportMemberError> validationErrors; // Cho validation errors khi import

    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public AppException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public AppException(ErrorCode errorCode, String message, List<ImportMemberError> validationErrors) {
        super(message);
        this.errorCode = errorCode;
        this.validationErrors = validationErrors;
    }

}
