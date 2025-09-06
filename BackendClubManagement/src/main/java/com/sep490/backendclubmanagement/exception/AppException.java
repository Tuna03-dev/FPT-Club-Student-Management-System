package com.sep490.backendclubmanagement.exception;

import lombok.Getter;

@Getter
public class AppException extends Exception{
    private final ErrorCode errorCode;

    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

}
