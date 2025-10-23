package com.sep490.backendclubmanagement.controller.Club;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.response.ClubRoleResponse;
import com.sep490.backendclubmanagement.dto.response.SemesterResponse;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.service.ClubRoleService;
import com.sep490.backendclubmanagement.service.SemesterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clubs")
@RequiredArgsConstructor
public class ClubInfoController {

    private final SemesterService semesterService;
    private final ClubRoleService clubRoleService;

    @GetMapping("/{clubId}/semesters")
    public ApiResponse<List<SemesterResponse>> getSemestersFromClubEstablishment(@PathVariable Long clubId) throws AppException {
        List<SemesterResponse> semesters = semesterService.getSemestersFromClubEstablishment(clubId);
        return ApiResponse.success(semesters);
    }

    @GetMapping("/{clubId}/roles")
    public ApiResponse<List<ClubRoleResponse>> getClubRoles(@PathVariable Long clubId) {
        List<ClubRoleResponse> clubRoles = clubRoleService.getClubRolesByClubId(clubId);
        return ApiResponse.success(clubRoles);
    }
}
