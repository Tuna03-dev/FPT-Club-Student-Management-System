package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.BatchMarkAttendanceRequest;
import com.sep490.backendclubmanagement.dto.request.CreateEventRequest;
import com.sep490.backendclubmanagement.dto.request.EventApprovalRequest;
import com.sep490.backendclubmanagement.dto.request.EventRequest;
import com.sep490.backendclubmanagement.dto.request.MarkAttendanceRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateEventRequest;
import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.RequestEvent;
import com.sep490.backendclubmanagement.exception.ForbiddenException;
import com.sep490.backendclubmanagement.service.EventManagementService;
import com.sep490.backendclubmanagement.service.EventService;
import com.sep490.backendclubmanagement.service.RoleService;
import com.sep490.backendclubmanagement.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final EventManagementService eventManagementService;
    private final RoleService roleService;
    
    @PostMapping("/get-all-by-filter")
    public ApiResponse<EventResponse> getAllEventsByFilter(@RequestBody EventRequest request){
         return ApiResponse.success(eventService.getAllEventsByFilter(request));
    }
    
    @GetMapping("/get-all-event-types")
    public ApiResponse<List<EventTypesDto>> getAllEventTypes(){
        return ApiResponse.success(eventService.getAllEventTypes());
    }

    @GetMapping("/{id}")
    public ApiResponse<EventData> getEventById(@PathVariable Long id){
         return ApiResponse.success(eventService.getEventById(id));
    }

    @GetMapping("/get-all-club")
    public ApiResponse<List<ClubDto>> getAllClubs(){
        return ApiResponse.success(eventService.getAllClubs());
    }

    @GetMapping("/club/{clubId}")
    public ApiResponse<List<EventData>> getEventsByClubId(@PathVariable Long clubId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(eventService.getEventsByClubId(clubId, userId));
    }

    /**
     * Staff: Lấy tất cả events (không cần check membership)
     */
    @GetMapping("/staff/all")
    public ApiResponse<List<EventData>> getStaffAllEvents() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền truy cập");
        }
        return ApiResponse.success(eventService.getStaffAllEvents());
    }

    /**
     * Staff: Lấy events theo clubId (không cần check membership)
     */
    @GetMapping("/staff/club/{clubId}")
    public ApiResponse<List<EventData>> getStaffEventsByClubId(@PathVariable Long clubId) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền truy cập");
        }
        return ApiResponse.success(eventService.getStaffEventsByClubId(clubId));
    }
    
    /**
     * Tạo event mới (với phân quyền)
     */
    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<EventData> createEvent(@Valid @ModelAttribute CreateEventRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(eventManagementService.createEvent(request, userId));
    }
    
    /**
     * CLUB_PRESIDENT duyệt event
     */
    @PostMapping("/approve/club")
    public ApiResponse<Void> approveByClub(@Valid @RequestBody EventApprovalRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        eventManagementService.approveEventByClub(request, userId);
        return ApiResponse.success();
    }
    
    /**
     * STAFF duyệt event
     */
    @PostMapping("/approve/university")
    public ApiResponse<Void> approveByStaff(@Valid @RequestBody EventApprovalRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        eventManagementService.approveEventByStaff(request, userId);
        return ApiResponse.success();
    }
    
    /**
     * Lấy danh sách request chờ duyệt
     */
    @GetMapping("/pending-requests")
    public ApiResponse<List<PendingRequestDto>> getPendingRequests() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(eventManagementService.getPendingRequests(userId));
    }

    /**
     * Lấy các event và trạng thái request chờ duyệt mà user hiện tại tạo (theo club)
     */
    @GetMapping("/my-draft-events")
    public ApiResponse<List<MyDraftEventDto>> getMyDraftEvents(
            @RequestParam(value = "clubId", required = false) Long clubId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(eventManagementService.getMyDraftEvents(userId, clubId));
    }

    /**
     * Cập nhật sự kiện nháp do user hiện tại tạo (theo role/status)
     */
    @PutMapping(value = "/{eventId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<EventData> updateMyDraftEvent(@PathVariable Long eventId,
                                                     @ModelAttribute UpdateEventRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(eventManagementService.updateMyDraftEvent(eventId, request, userId));
    }

    /**
     * Xóa sự kiện nháp do user hiện tại tạo (theo role/status)
     */
    @DeleteMapping("/{eventId}")
    public ApiResponse<Void> deleteMyDraftEvent(@PathVariable Long eventId) {
        Long userId = SecurityUtils.getCurrentUserId();
        eventManagementService.deleteMyDraftEvent(eventId, userId);
        return ApiResponse.success();
    }

    /**
     * Đăng ký tham gia sự kiện
     */
    @PostMapping("/{eventId}/register")
    public ApiResponse<Void> registerForEvent(@PathVariable Long eventId) {
        Long userId = SecurityUtils.getCurrentUserId();
        eventService.registerForEvent(eventId, userId);
        return ApiResponse.success();
    }

    /**
     * Hủy đăng ký sự kiện
     */
    @DeleteMapping("/{eventId}/register")
    public ApiResponse<Void> cancelEventRegistration(@PathVariable Long eventId) {
        Long userId = SecurityUtils.getCurrentUserId();
        eventService.cancelEventRegistration(eventId, userId);
        return ApiResponse.success();
    }

    /**
     * Kiểm tra user đã đăng ký sự kiện chưa
     */
    @GetMapping("/{eventId}/registration-status")
    public ApiResponse<Boolean> getRegistrationStatus(@PathVariable Long eventId) {
        Long userId = SecurityUtils.getCurrentUserId();
        boolean isRegistered = eventService.isUserRegisteredForEvent(eventId, userId);
        return ApiResponse.success(isRegistered);
    }

    /**
     * Lấy số lượng người đã đăng ký sự kiện
     */
    @GetMapping("/{eventId}/registration-count")
    public ApiResponse<Long> getEventRegistrationCount(@PathVariable Long eventId) {
        Long count = eventService.getEventRegistrationCount(eventId);
        return ApiResponse.success(count);
    }

    /**
     * Lấy danh sách người đăng ký sự kiện (chỉ ban cán sự mới có quyền xem)
     */
    @GetMapping("/{eventId}/registrations")
    public ApiResponse<List<EventRegistrationDto>> getEventRegistrations(@PathVariable Long eventId,
                                                                         @RequestParam(value = "keyword", required = false) String keyword) {
        Long userId = SecurityUtils.getCurrentUserId();
        
        // Lấy clubId từ event để kiểm tra quyền theo club
        EventData event = eventService.getEventById(eventId);
        Long clubId = event != null ? event.getClubId() : null;
        if (clubId == null) {
            throw new ForbiddenException("Event không thuộc về club nào");
        }
        
        // Kiểm tra quyền President hoặc Officer theo club cụ thể
        if (!roleService.isClubPresident(userId, clubId) && !roleService.isClubOfficer(userId, clubId)) {
            throw new ForbiddenException("Chỉ ban cán sự của CLB này mới có quyền xem danh sách đăng ký");
        }
        
        return ApiResponse.success(eventService.getEventRegistrations(eventId, keyword));
    }

    /**
     * Club President: Điểm danh hàng loạt cho tất cả người tham gia sự kiện
     */
    @PostMapping("/batch-mark-attendance")
    public ApiResponse<Void> batchMarkAttendance(@Valid @RequestBody BatchMarkAttendanceRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        
        // Lấy clubId từ event để kiểm tra quyền theo club
        EventData event = eventService.getEventById(request.getEventId());
        Long clubId = event != null ? event.getClubId() : null;
        if (clubId == null) {
            throw new ForbiddenException("Event không thuộc về club nào");
        }
        
        // Kiểm tra quyền President hoặc Officer theo club cụ thể
        if (!roleService.isClubPresident(userId, clubId) && !roleService.isClubOfficer(userId, clubId)) {
            throw new ForbiddenException("Chỉ ban cán sự của CLB này mới có quyền điểm danh");
        }
        
        eventService.batchMarkAttendance(request.getEventId(), request.getAttendances());
        
        return ApiResponse.success();
    }
}
