package com.sep490.backendclubmanagement.controller;

import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.CreateEventRequest;
import com.sep490.backendclubmanagement.dto.request.EventApprovalRequest;
import com.sep490.backendclubmanagement.dto.request.EventRequest;
import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.RequestEvent;
import com.sep490.backendclubmanagement.service.EventManagementService;
import com.sep490.backendclubmanagement.service.EventService;
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
}
