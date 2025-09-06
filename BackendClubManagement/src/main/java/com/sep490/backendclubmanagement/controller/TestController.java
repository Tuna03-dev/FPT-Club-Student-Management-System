package com.sep490.backendclubmanagement.controller;



import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;



@RestController
@RequestMapping("/test")
@Validated

public class TestController {

    @GetMapping("/success")
    public ApiResponse<String> success() {
        return ApiResponse.success("Hello World 12345");
    }

    @GetMapping("/user-not-found")
    public ApiResponse<String> throwUserNotFound() throws AppException {
        throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
    }



    @PostMapping("/validate")
    public ApiResponse<String> validate(@RequestParam @NotBlank(message = "name must not be blank") String name) {
        return ApiResponse.success(name);
    }
}
