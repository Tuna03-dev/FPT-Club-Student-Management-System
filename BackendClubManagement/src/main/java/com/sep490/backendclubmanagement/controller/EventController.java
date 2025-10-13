package com.sep490.backendclubmanagement.controller;


import com.sep490.backendclubmanagement.dto.ApiResponse;
import com.sep490.backendclubmanagement.dto.request.EventRequest;
import com.sep490.backendclubmanagement.dto.response.EventResponse;
import com.sep490.backendclubmanagement.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    @PostMapping("/get-all-by-filter")
    public ApiResponse<EventResponse> getAllEventsByFilter(@RequestBody EventRequest request){
         return ApiResponse.success(eventService.getAllEventsByFilter(request));

}
}
