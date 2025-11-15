package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.ClubCategoryDTO;

import java.util.List;

public interface ClubCategoryService {
    List<ClubCategoryDTO> getAllClubCategories();
}

