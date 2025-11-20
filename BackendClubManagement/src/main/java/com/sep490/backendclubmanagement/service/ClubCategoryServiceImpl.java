package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.ClubCategoryFilterRequest;
import com.sep490.backendclubmanagement.dto.request.CreateClubCategoryRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateClubCategoryRequest;
import com.sep490.backendclubmanagement.dto.response.ClubCategoryDTO;
import com.sep490.backendclubmanagement.dto.response.PageResponse;
import com.sep490.backendclubmanagement.entity.ClubCategory;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.exception.ForbiddenException;
import com.sep490.backendclubmanagement.exception.NotFoundException;
import com.sep490.backendclubmanagement.mapper.ClubCategoryMapper;
import com.sep490.backendclubmanagement.repository.ClubCategoryRepository;
import com.sep490.backendclubmanagement.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClubCategoryServiceImpl implements ClubCategoryService {

    private final ClubCategoryRepository clubCategoryRepository;
    private final ClubCategoryMapper clubCategoryMapper;
    private final RoleService roleService;

    @Override
    @Transactional(readOnly = true)
    public List<ClubCategoryDTO> getAllClubCategories() {
        List<ClubCategory> categories = clubCategoryRepository.findAll();
        return clubCategoryMapper.toDTOList(categories);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClubCategoryDTO> getAllClubCategoriesWithFilter(ClubCategoryFilterRequest request) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền truy cập");
        }

        Pageable pageable = request.getPageable("id,desc");
        Page<ClubCategory> categoryPage = clubCategoryRepository.findAllWithFilter(
            request.getKeyword(),
            pageable
        );

        Page<ClubCategoryDTO> dtoPage = categoryPage.map(clubCategoryMapper::toDTO);
        return PageResponse.of(dtoPage);
    }

    @Override
    @Transactional(readOnly = true)
    public ClubCategoryDTO getClubCategoryById(Long id) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền truy cập");
        }

        ClubCategory category = clubCategoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy thể loại câu lạc bộ với ID: " + id));
        return clubCategoryMapper.toDTO(category);
    }

    @Override
    @Transactional
    public ClubCategoryDTO createClubCategory(CreateClubCategoryRequest request) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền tạo thể loại câu lạc bộ");
        }

        // Kiểm tra tên thể loại đã tồn tại chưa
        if (clubCategoryRepository.existsByCategoryNameIgnoreCase(request.getCategoryName())) {
            throw new AppException(ErrorCode.CLUB_CATEGORY_ALREADY_EXISTS);
        }

        ClubCategory category = ClubCategory.builder()
            .categoryName(request.getCategoryName().trim())
            .build();

        ClubCategory savedCategory = clubCategoryRepository.save(category);
        log.info("Created club category with ID: {}", savedCategory.getId());

        return clubCategoryMapper.toDTO(savedCategory);
    }

    @Override
    @Transactional
    public ClubCategoryDTO updateClubCategory(Long id, UpdateClubCategoryRequest request) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền cập nhật thể loại câu lạc bộ");
        }

        ClubCategory category = clubCategoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy thể loại câu lạc bộ với ID: " + id));

        // Kiểm tra tên thể loại mới có trùng với thể loại khác không
        if (clubCategoryRepository.existsByCategoryNameIgnoreCaseAndIdNot(request.getCategoryName(), id)) {
            throw new AppException(ErrorCode.CLUB_CATEGORY_ALREADY_EXISTS);
        }

        category.setCategoryName(request.getCategoryName().trim());
        ClubCategory updatedCategory = clubCategoryRepository.save(category);
        log.info("Updated club category with ID: {}", id);

        return clubCategoryMapper.toDTO(updatedCategory);
    }

    @Override
    @Transactional
    public void deleteClubCategory(Long id) throws AppException {
        Long userId = SecurityUtils.getCurrentUserId();
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền xóa thể loại câu lạc bộ");
        }

        ClubCategory category = clubCategoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy thể loại câu lạc bộ với ID: " + id));

        // Kiểm tra xem có câu lạc bộ nào đang sử dụng thể loại này không
        if (category.getClubs() != null && !category.getClubs().isEmpty()) {
            throw new AppException(ErrorCode.CLUB_CATEGORY_IN_USE,
                "Không thể xóa thể loại này vì đang có " + category.getClubs().size() + " câu lạc bộ sử dụng");
        }

        clubCategoryRepository.delete(category);
        log.info("Deleted club category with ID: {}", id);
    }
}
