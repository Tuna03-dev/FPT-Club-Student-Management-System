package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.ClubCategoryDTO;
import com.sep490.backendclubmanagement.entity.ClubCategory;
import com.sep490.backendclubmanagement.mapper.ClubCategoryMapper;
import com.sep490.backendclubmanagement.repository.ClubCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubCategoryServiceImpl implements ClubCategoryService {

    private final ClubCategoryRepository clubCategoryRepository;
    private final ClubCategoryMapper clubCategoryMapper;

    @Override
    @Transactional(readOnly = true)
    public List<ClubCategoryDTO> getAllClubCategories() {
        List<ClubCategory> categories = clubCategoryRepository.findAll();
        return clubCategoryMapper.toDTOList(categories);
    }
}

