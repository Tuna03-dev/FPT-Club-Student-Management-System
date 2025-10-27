package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateEventRequest;
import com.sep490.backendclubmanagement.dto.request.EventApprovalRequest;
import com.sep490.backendclubmanagement.dto.response.EventData;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.ForbiddenException;
import com.sep490.backendclubmanagement.exception.NotFoundException;
import com.sep490.backendclubmanagement.mapper.EventMapper;
import com.sep490.backendclubmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventManagementService {
    
    private final EventRepository eventRepository;
    private final RequestEventRepository requestEventRepository;
    private final RoleService roleService;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final EventTypeRepository eventTypeRepository;
    private final EventMapper eventMapper;
    private final EventMediaRepository eventMediaRepository;
    private final CloudinaryService cloudinaryService;

    /**
     * Tạo event với phân quyền đầy đủ
     */
    @Transactional
    public EventData createEvent(CreateEventRequest request, Long userId) {
        // 1. Lấy thông tin user, club, event type
        User user = getUserById(userId);
        Club club = getClubById(request.getClubId());
        EventType eventType = getEventTypeById(request.getEventTypeId());

        // 2. Kiểm tra quyền tạo event
        if (!roleService.canCreateEvent(userId, request.getClubId())) {
            throw new ForbiddenException("Bạn không có quyền tạo sự kiện cho câu lạc bộ này.");
        }

        // 3. Xác định role của user và loại event
        boolean isStaff = roleService.isStaff(userId);
        boolean isClubPresident = roleService.isClubPresident(userId, request.getClubId());
        boolean isClubOfficer = roleService.isClubOfficer(userId, request.getClubId());
        boolean isMeeting = eventType != null && "MEETING".equalsIgnoreCase(eventType.getTypeName());
        
        // 4. Tạo event
        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .club(club)
                .eventType(eventType)
                .isDraft(false) // Mặc định là false, sẽ thay đổi tùy workflow
                .build();
        
        Event savedEvent = eventRepository.save(event);
        
        // 5. Upload và lưu ảnh nếu có
        if (request.getMediaFiles() != null && !request.getMediaFiles().isEmpty()) {
            uploadAndSaveEventMedia(savedEvent, request.getMediaFiles());
        }
        
        // 6. Xử lý theo workflow
        if (isStaff || isMeeting) {
            // STAFF hoặc MEETING: Tạo trực tiếp (không cần approval)
            log.info("Event created directly (STAFF or MEETING)");
            return eventMapper.toDto(savedEvent);
        } else if (isClubPresident) {
            // CLUB_PRESIDENT: Gửi lên STAFF
            savedEvent.setIsDraft(true);
            eventRepository.save(savedEvent);
            
            RequestEvent requestEvent = RequestEvent.builder()
                    .requestTitle(request.getTitle())
                    .status(RequestStatus.PENDING_UNIVERSITY)
                    .requestDate(LocalDateTime.now())
                    .description(request.getDescription())
                    .event(savedEvent)
                    .createdBy(user)
                    .build();
            
            requestEventRepository.save(requestEvent);
            return eventMapper.toDto(savedEvent);
            
        } else if (isClubOfficer) {
            // CLUB_OFFICER: Gửi lên CLUB_PRESIDENT
            savedEvent.setIsDraft(true);
            eventRepository.save(savedEvent);
            
            RequestEvent requestEvent = RequestEvent.builder()
                    .requestTitle(request.getTitle())
                    .status(RequestStatus.PENDING_CLUB)
                    .requestDate(LocalDateTime.now())
                    .description(request.getDescription())
                    .event(savedEvent)
                    .createdBy(user)
                    .build();
            
            requestEventRepository.save(requestEvent);
            return eventMapper.toDto(savedEvent);
        }
        
        throw new ForbiddenException("Role không được hỗ trợ cho việc tạo sự kiện này.");
    }
    
    /**
     * Lấy user theo ID
     */
    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found with ID: " + userId));
    }

    /**
     * Lấy club theo ID
     */
    private Club getClubById(Long clubId) {
        return clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));
    }

    /**
     * Lấy event type theo ID
     */
    private EventType getEventTypeById(Long eventTypeId) {
        return eventTypeRepository.findById(eventTypeId)
                .orElseThrow(() -> new NotFoundException("Event Type not found with ID: " + eventTypeId));
    }
    
    /**
     * Upload và lưu media cho event
     */
    private void uploadAndSaveEventMedia(Event event, List<MultipartFile> mediaFiles) {
        if (mediaFiles == null || mediaFiles.isEmpty()) {
            return;
        }
        
        List<EventMedia> eventMediaList = new ArrayList<>();
        int displayOrder = 1;
        
        for (MultipartFile file : mediaFiles) {
            if (file.isEmpty()) {
                continue;
            }
            
            try {
                // Upload lên Cloudinary - folder: club/events
                CloudinaryService.UploadResult uploadResult = cloudinaryService.uploadImage(file, "club/events");
                
                // Tạo EventMedia
                EventMedia eventMedia = EventMedia.builder()
                        .event(event)
                        .mediaUrl(uploadResult.url())
                        .mediaType(MediaType.IMAGE)
                        .displayOrder(displayOrder++)
                        .build();
                
                eventMediaList.add(eventMedia);
                
            } catch (Exception e) {
                log.error("Failed to upload media for event {}: {}", event.getId(), e.getMessage());
            }
        }
        
        // Lưu tất cả EventMedia
        if (!eventMediaList.isEmpty()) {
            eventMediaRepository.saveAll(eventMediaList);
        }
    }
    
    /**
     * CLUB_PRESIDENT duyệt event của CLUB_OFFICER
     */
    @Transactional
    public void approveEventByClub(EventApprovalRequest request, Long userId) {
        RequestEvent requestEvent = requestEventRepository.findByIdWithEventAndClub(request.getRequestEventId())
                .orElseThrow(() -> new NotFoundException("Request event not found"));
        
        // Kiểm tra quyền
        if (!roleService.isClubPresident(userId, requestEvent.getEvent().getClub().getId())) {
            throw new ForbiddenException("Chỉ CLUB_PRESIDENT mới có quyền duyệt");
        }
        
        // Kiểm tra status
        if (requestEvent.getStatus() != RequestStatus.PENDING_CLUB) {
            throw new ForbiddenException("Request không ở trạng thái PENDING_CLUB");
        }
        
        if (request.getStatus() == RequestStatus.APPROVED_CLUB) {
            requestEvent.setStatus(RequestStatus.PENDING_UNIVERSITY);
        } else {
            requestEvent.setStatus(RequestStatus.REJECTED_CLUB);
        }
        
        requestEvent.setResponseMessage(request.getResponseMessage());
        requestEventRepository.save(requestEvent);
    }
    
    /**
     * STAFF duyệt event
     */
    @Transactional
    public void approveEventByStaff(EventApprovalRequest request, Long userId) {
        RequestEvent requestEvent = requestEventRepository.findByIdWithEventAndClub(request.getRequestEventId())
                .orElseThrow(() -> new NotFoundException("Request event not found"));
        
        // Kiểm tra quyền
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền duyệt");
        }
        
        // Kiểm tra status
        if (requestEvent.getStatus() != RequestStatus.PENDING_UNIVERSITY) {
            throw new ForbiddenException("Request không ở trạng thái PENDING_UNIVERSITY");
        }
        
        if (request.getStatus() == RequestStatus.APPROVED_UNIVERSITY) {
            Event event = requestEvent.getEvent();
            event.setIsDraft(false);
            eventRepository.save(event);
            
            requestEvent.setStatus(RequestStatus.APPROVED_UNIVERSITY);
        } else {
            requestEvent.setStatus(RequestStatus.REJECTED_UNIVERSITY);
        }
        
        requestEvent.setResponseMessage(request.getResponseMessage());
        requestEventRepository.save(requestEvent);
    }
    
    /**
     * Lấy danh sách request chờ duyệt
     */
    public List<RequestEvent> getPendingRequests(Long userId) {
        if (roleService.isStaff(userId)) {
            // STAFF thấy tất cả các request PENDING_UNIVERSITY
            return requestEventRepository.findByStatus(RequestStatus.PENDING_UNIVERSITY);
        }
        
        // CLUB_PRESIDENT thấy các request PENDING_CLUB của club mình
        // TODO: Lấy danh sách club mà user là president
        // Tạm thời trả về empty list vì cần implement logic lấy clubs
        return List.of();
    }
}
