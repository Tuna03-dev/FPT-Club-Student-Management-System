package com.sep490.backendclubmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubmitFinalFormRequest {

    @NotBlank(message = "Tiêu đề form không được để trống")
    private String title;

    // fileUrl: URL của file đã upload trước đó (optional nếu có file)
    // Nếu không có fileUrl thì phải có file trong request
    private String fileUrl;

    // Ghi chú/nhận xét của sinh viên khi nộp form cuối (optional)
    private String comment;
}

