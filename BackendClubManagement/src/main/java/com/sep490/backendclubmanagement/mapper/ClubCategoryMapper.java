package com.sep490.backendclubmanagement.mapper;

import com.sep490.backendclubmanagement.dto.response.ClubCategoryDTO;
import com.sep490.backendclubmanagement.entity.ClubCategory;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClubCategoryMapper {

    ClubCategoryDTO toDTO(ClubCategory clubCategory);

    List<ClubCategoryDTO> toDTOList(List<ClubCategory> clubCategories);
}

