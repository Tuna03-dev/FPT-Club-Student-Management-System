package com.sep490.backendclubmanagement.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
public class CloudinaryService {
    private final Cloudinary cloudinary;



    public UploadResult uploadImage(MultipartFile file) {
        try {
            var result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "club/posts",
                            "resource_type", "image",
                            "overwrite", false
                    )
            );
            return new UploadResult(
                    (String) result.get("secure_url"),
                    (String) result.get("public_id"),
                    (String) result.get("format"),
                    ((Number) result.get("bytes")).longValue()
            );
        } catch (Exception e) {
            throw new RuntimeException("Cloudinary upload fail: " + e.getMessage(), e);
        }
    }
    /**
     * Upload BẤT ĐỒNG BỘ: chạy trên thread pool 'uploadExecutor'
     * - Dùng cho upload song song nhiều ảnh trong PostService.
     * - Trả về CompletableFuture để caller .join()/.allOf() quản lý đồng bộ cuối cùng.
     */
    @Async("uploadExecutor")
    public CompletableFuture<UploadResult> uploadImageAsync(MultipartFile file) {
        try {
            // Tái sử dụng logic đồng bộ cho nhất quán
            UploadResult res = uploadImage(file);
            return CompletableFuture.completedFuture(res);
        } catch (Exception e) {
            // Đẩy lỗi ra future để phía gọi tự quyết định fail toàn bộ hay bỏ qua file lỗi
            return CompletableFuture.failedFuture(e);
        }
    }


    /**
     * Upload file (PDF, DOC, DOCX, etc.) to Cloudinary
     * @param file MultipartFile to upload
     * @return UploadResult with file URL and metadata
     */
    public UploadResult uploadFile(MultipartFile file) {
        try {
            var result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "club/recruitment",
                            "resource_type", "raw", // Use 'raw' for non-image files
                            "overwrite", false
                    )
            );
            return new UploadResult(
                    (String) result.get("secure_url"),
                    (String) result.get("public_id"),
                    (String) result.get("format"),
                    ((Number) result.get("bytes")).longValue()
            );
        } catch (Exception e) {
            throw new RuntimeException("Cloudinary upload fail: " + e.getMessage(), e);
        }
    }

    public record UploadResult(String url, String publicId, String format, long bytes) {}
}
