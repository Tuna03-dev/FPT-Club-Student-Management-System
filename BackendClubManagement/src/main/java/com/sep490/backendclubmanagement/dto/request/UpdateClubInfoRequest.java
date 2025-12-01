package com.sep490.backendclubmanagement.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateClubInfoRequest {

    @NotBlank(message = "Tên câu lạc bộ không được để trống")
    private String clubName;

    @NotBlank(message = "Mã câu lạc bộ không được để trống")
    private String clubCode;

    @Size(max = 2000, message = "Mô tả không được quá 2000 ký tự")
    private String description;

    private String logoUrl;

    private String bannerUrl;
    private long categoryId;

    @Email(message = "Email không hợp lệ")
    @Size(max = 100, message = "Email không được quá 100 ký tự")
    private String email;

    @Pattern(regexp = "^[0-9]{10,11}$", message = "Số điện thoại phải có 10-11 chữ số")
    private String phone;

    @Size(max = 500, message = "Facebook URL không được quá 500 ký tự")
    private String fbUrl;

    @Size(max = 500, message = "Instagram URL không được quá 500 ký tự")
    private String igUrl;

    @Size(max = 500, message = "TikTok URL không được quá 500 ký tự")
    private String ttUrl;

    @Size(max = 500, message = "YouTube URL không được quá 500 ký tự")
    private String ytUrl;

    private Boolean removeLogo;
    private Boolean removeBanner;
}

