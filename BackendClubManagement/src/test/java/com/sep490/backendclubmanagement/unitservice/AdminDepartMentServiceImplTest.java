package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.request.AdminDepartmentUpdateRequest;
import com.sep490.backendclubmanagement.dto.response.AdminDepartmentResponse;
import com.sep490.backendclubmanagement.entity.AdminDepartment;
import com.sep490.backendclubmanagement.entity.Campus;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.AdminDepartmentMapper;
import com.sep490.backendclubmanagement.repository.AdminDepartmentRepository;
import com.sep490.backendclubmanagement.repository.CampusRepository;
import com.sep490.backendclubmanagement.service.AdminDepartmentServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminDepartmentServiceImplTest {

    @Mock
    private AdminDepartmentRepository adminDepartmentRepository;

    @Mock
    private CampusRepository campusRepository;

    @Mock
    private AdminDepartmentMapper adminDepartmentMapper;

    @InjectMocks
    private AdminDepartmentServiceImpl adminDepartmentService;

    // ===== helpers =====

    private AdminDepartment sampleDepartment(Long id, Campus campus) {
        AdminDepartment d = new AdminDepartment();
        d.setId(id);
        d.setCampus(campus);
        return d;
    }

    private Campus sampleCampus(Long id) {
        Campus c = new Campus();
        c.setId(id);
        return c;
    }

    // ========== getDepartmentById ==========

    @Test
    void getDepartmentById_success_shouldReturnMappedDto() throws AppException {
        Long id = 1L;
        Campus campus = sampleCampus(10L);
        AdminDepartment dept = sampleDepartment(id, campus);

        AdminDepartmentResponse dto = new AdminDepartmentResponse();

        when(adminDepartmentRepository.findByIdWithCampus(id)).thenReturn(Optional.of(dept));
        when(adminDepartmentMapper.toDTO(dept)).thenReturn(dto);

        AdminDepartmentResponse result = adminDepartmentService.getDepartmentById(id);

        assertSame(dto, result);
        verify(adminDepartmentRepository).findByIdWithCampus(id);
        verify(adminDepartmentMapper).toDTO(dept);
    }

    @Test
    void getDepartmentById_notFound_shouldThrowNotFound() {
        Long id = 1L;
        when(adminDepartmentRepository.findByIdWithCampus(id)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> adminDepartmentService.getDepartmentById(id));

        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
        verify(adminDepartmentMapper, never()).toDTO(any());
    }

    // ========== getDepartmentsByCampus ==========

    @Test
    void getDepartmentsByCampus_shouldFilterByCampusIdAndMapDtos() {
        Long campusId = 10L;

        Campus c1 = sampleCampus(10L);
        Campus c2 = sampleCampus(20L);

        AdminDepartment d1 = sampleDepartment(1L, c1);    // match
        AdminDepartment d2 = sampleDepartment(2L, c2);    // khác campus
        AdminDepartment d3 = sampleDepartment(3L, null);  // campus null

        List<AdminDepartment> all = new ArrayList<AdminDepartment>();
        all.add(d1);
        all.add(d2);
        all.add(d3);

        List<AdminDepartmentResponse> dtoList = new ArrayList<AdminDepartmentResponse>();
        dtoList.add(new AdminDepartmentResponse());

        when(adminDepartmentRepository.findAll()).thenReturn(all);
        // chỉ cần stub anyList, không cần match exact list để tránh rối
        when(adminDepartmentMapper.toDTOs(anyList())).thenReturn(dtoList);

        List<AdminDepartmentResponse> result =
                adminDepartmentService.getDepartmentsByCampus(campusId);

        assertEquals(1, result.size());
        assertSame(dtoList, result);

        // kiểm tra list đã được filter đúng (chỉ còn d1)
        ArgumentCaptor<List<AdminDepartment>> captor =
                ArgumentCaptor.forClass(List.class);
        verify(adminDepartmentMapper).toDTOs(captor.capture());
        List<AdminDepartment> filtered = captor.getValue();
        assertEquals(1, filtered.size());
        assertEquals(d1.getId(), filtered.get(0).getId());
    }

    @Test
    void getDepartmentsByCampus_noMatch_shouldReturnEmptyList() {
        Long campusId = 99L;

        Campus c1 = sampleCampus(10L);
        AdminDepartment d1 = sampleDepartment(1L, c1);

        List<AdminDepartment> all = new ArrayList<AdminDepartment>();
        all.add(d1);

        when(adminDepartmentRepository.findAll()).thenReturn(all);
        when(adminDepartmentMapper.toDTOs(Collections.<AdminDepartment>emptyList()))
                .thenReturn(Collections.<AdminDepartmentResponse>emptyList());

        List<AdminDepartmentResponse> result =
                adminDepartmentService.getDepartmentsByCampus(campusId);

        assertTrue(result.isEmpty());
    }

    // ========== updateDepartment ==========

    @Test
    void updateDepartment_success_shouldUpdateAndChangeCampus() throws AppException {
        Long id = 1L;
        Campus oldCampus = sampleCampus(10L);
        AdminDepartment dept = sampleDepartment(id, oldCampus);

        AdminDepartmentUpdateRequest req = new AdminDepartmentUpdateRequest();

        req.setCampusId(20L);

        Campus newCampus = sampleCampus(20L);

        when(adminDepartmentRepository.findByIdWithCampus(id)).thenReturn(Optional.of(dept));
        when(campusRepository.findById(20L)).thenReturn(Optional.of(newCampus));
        when(adminDepartmentRepository.save(dept)).thenAnswer(inv -> inv.getArgument(0));

        AdminDepartmentResponse expected = new AdminDepartmentResponse();
        when(adminDepartmentMapper.toDTO(dept)).thenReturn(expected);

        AdminDepartmentResponse result =
                adminDepartmentService.updateDepartment(id, req);

        assertSame(expected, result);
        // mapper updateEntityFromRequest là void, chỉ cần verify được gọi
        verify(adminDepartmentMapper).updateEntityFromRequest(req, dept);
        assertSame(newCampus, dept.getCampus());
        verify(adminDepartmentRepository).save(dept);
    }

    @Test
    void updateDepartment_departmentNotFound_shouldThrowNotFound() {
        Long id = 1L;
        AdminDepartmentUpdateRequest req = new AdminDepartmentUpdateRequest();

        when(adminDepartmentRepository.findByIdWithCampus(id)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> adminDepartmentService.updateDepartment(id, req));

        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
        verify(adminDepartmentRepository, never()).save(any());
    }

    @Test
    void updateDepartment_campusIdNotFound_shouldThrowNotFound() {
        Long id = 1L;
        AdminDepartment dept = sampleDepartment(id, sampleCampus(10L));

        AdminDepartmentUpdateRequest req = new AdminDepartmentUpdateRequest();
        req.setCampusId(99L);

        when(adminDepartmentRepository.findByIdWithCampus(id)).thenReturn(Optional.of(dept));
        when(campusRepository.findById(99L)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> adminDepartmentService.updateDepartment(id, req));

        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
        verify(adminDepartmentRepository, never()).save(any());
    }
}
