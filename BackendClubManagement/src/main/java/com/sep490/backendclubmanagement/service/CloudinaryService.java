package com.sep490.backendclubmanagement.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

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

    public record UploadResult(String url, String publicId, String format, long bytes) {}
}
