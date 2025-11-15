package com.sep490.backendclubmanagement.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, 500, "Internal server error"),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, 1000, "Validation failed"),
    UNAUTHORIZED(HttpStatus.FORBIDDEN, 403, "User is not allowed to access"),
    INSUFFICIENT_PERMISSION(HttpStatus.FORBIDDEN, 403, "Insufficient permission"),
    FORBIDDEN(HttpStatus.FORBIDDEN, 403, "User is not allowed to access"),
    ORG_UNAUTHORIZED(HttpStatus.FORBIDDEN, 403, "Your account is not with our organization"),
    CLUB_NOT_FOUND(HttpStatus.NOT_FOUND, 2000, "Club not found"),
    NOT_FOUND(HttpStatus.NOT_FOUND,404, "Resource not found"),
    ROLE_NOT_FOUND(HttpStatus.NOT_FOUND, 2001, "Role not found"),
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, 2002, "Member not found"),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, 2003, "User not found"),
    SEMESTER_NOT_FOUND(HttpStatus.NOT_FOUND, 2004, "Semester not found"),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, 401, "User is not authenticated"),
    RECRUITMENT_CLOSED(HttpStatus.BAD_REQUEST, 3000, "Không thể chỉnh sửa đợt tuyển dụng đã đóng"),
    ALREADY_CLUB_MEMBER(HttpStatus.BAD_REQUEST, 3001, "Bạn đã là thành viên của câu lạc bộ này"),
    INSUFFICIENT_PERMISSIONS(HttpStatus.FORBIDDEN, 4001, "Bạn không có quyền thực hiện thao tác này"),
    NOT_CLUB_OFFICER(HttpStatus.FORBIDDEN, 4002, "Chỉ cán bộ câu lạc bộ mới có quyền thực hiện thao tác này"),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, 1001, "Dữ liệu không hợp lệ"),
    ALREADY_APPLIED(HttpStatus.BAD_REQUEST, 3002, "Bạn đã nộp đơn ứng tuyển cho đợt tuyển dụng này!");

    private final HttpStatus httpStatus;
    private final int code;
    private final String message;

    ErrorCode(HttpStatus httpStatus, int code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }
}
