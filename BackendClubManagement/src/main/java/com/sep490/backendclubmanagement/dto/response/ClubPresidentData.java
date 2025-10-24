package com.sep490.backendclubmanagement.dto.response;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubPresidentData {
    private Long userId;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String studentCode;
    private String avatarUrl;
    private LocalDate joinDate;
    private String roleName;
}
