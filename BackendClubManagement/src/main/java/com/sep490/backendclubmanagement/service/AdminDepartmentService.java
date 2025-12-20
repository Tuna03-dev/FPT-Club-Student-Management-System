package com.sep490.backendclubmanagement.service;


import com.sep490.backendclubmanagement.dto.request.AdminDepartmentUpdateRequest;
import com.sep490.backendclubmanagement.dto.response.AdminDepartmentResponse;
import com.sep490.backendclubmanagement.exception.AppException;

import java.util.List;

public interface AdminDepartmentService {

    AdminDepartmentResponse getDepartmentById(Long id) throws AppException;

    List<AdminDepartmentResponse> getDepartmentsByCampus(Long campusId);

    AdminDepartmentResponse updateDepartment(Long id, AdminDepartmentUpdateRequest request) throws AppException;
}
