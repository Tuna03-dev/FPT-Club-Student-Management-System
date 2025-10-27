package com.sep490.backendclubmanagement.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, 500, "Internal server error"),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, 1000, "Validation failed"),
    UNAUTHORIZED(HttpStatus.FORBIDDEN, 403, "User is not allowed to access"),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, 403, "Access denied"),
    CLUB_NOT_FOUND(HttpStatus.NOT_FOUND, 2000, "Club not found"),
    NOT_FOUND(HttpStatus.NOT_FOUND,404, "Resource not found");

    private final HttpStatus httpStatus;
    private final int code;
    private final String message;

    ErrorCode(HttpStatus httpStatus, int code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }
}
