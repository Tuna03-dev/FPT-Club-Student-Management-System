package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.CreateEventRequest;
import com.sep490.backendclubmanagement.dto.request.EventApprovalRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateEventRequest;
import com.sep490.backendclubmanagement.dto.response.EventData;
import com.sep490.backendclubmanagement.dto.response.MyDraftEventDto;
import com.sep490.backendclubmanagement.dto.response.PendingRequestDto;
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


    @Transactional
    public EventData createEvent(CreateEventRequest request, Long userId) {
        User user = getUserById(userId);
        boolean isStaff = roleService.isStaff(userId);
        EventType eventType = getEventTypeById(request.getEventTypeId());

        if (!roleService.canCreateEvent(userId, request.getClubId())) {
            throw new ForbiddenException("Bạn không có quyền tạo sự kiện cho câu lạc bộ này.");
        }

        boolean isClubPresident = request.getClubId() != null && roleService.isClubPresident(userId, request.getClubId());
        boolean isClubOfficer = request.getClubId() != null && roleService.isClubOfficer(userId, request.getClubId());
        boolean isMeeting = eventType != null && "MEETING".equalsIgnoreCase(eventType.getTypeName());
        
        Club club = null;
        if (!isStaff) {
            if (request.getClubId() == null) {
                throw new NotFoundException("Club ID is required for non-staff creators");
            }
            club = getClubById(request.getClubId());
        }

        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .club(club)
                .eventType(eventType)
                .isDraft(false)
                .build();
        
        Event savedEvent = eventRepository.save(event);
        
        if (request.getMediaFiles() != null && !request.getMediaFiles().isEmpty()) {
            uploadAndSaveEventMedia(savedEvent, request.getMediaFiles());
        }
        
        if (isStaff || isMeeting) {
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
    

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found with ID: " + userId));
    }


    private Club getClubById(Long clubId) {
        return clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("Club not found with ID: " + clubId));
    }


    private EventType getEventTypeById(Long eventTypeId) {
        if (eventTypeId == null) return null;
        return eventTypeRepository.findById(eventTypeId)
                .orElseThrow(() -> new NotFoundException("Event type not found with ID: " + eventTypeId));
    }
    

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
                CloudinaryService.UploadResult uploadResult = cloudinaryService.uploadImage(file, "club/events");
                
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
        
        if (!eventMediaList.isEmpty()) {
            eventMediaRepository.saveAll(eventMediaList);
        }
    }
    

    @Transactional
    public void approveEventByClub(EventApprovalRequest request, Long userId) {
        RequestEvent requestEvent = requestEventRepository.findByIdWithEventAndClub(request.getRequestEventId())
                .orElseThrow(() -> new NotFoundException("Request event not found"));
        
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
    

    @Transactional
    public void approveEventByStaff(EventApprovalRequest request, Long userId) {
        RequestEvent requestEvent = requestEventRepository.findByIdWithEventAndClub(request.getRequestEventId())
                .orElseThrow(() -> new NotFoundException("Request event not found"));
        
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
    
    public List<PendingRequestDto> getPendingRequests(Long userId) {
        if (roleService.isStaff(userId)) {
            List<RequestEvent> list = requestEventRepository.findAllByStatusWithAll(RequestStatus.PENDING_UNIVERSITY);
            return mapToPendingDtos(list);
        }
        if (roleService.isClubPresident(userId)) {
            List<Club> clubs = roleService.getClubsWhereUserIsPresident(userId);
            if (clubs.isEmpty()) return List.of();
            List<RequestEvent> result = new ArrayList<>();
            for (Club club : clubs) {
                result.addAll(requestEventRepository.findAllByStatusAndClubIdWithAll(RequestStatus.PENDING_CLUB, club.getId()));
            }
            return mapToPendingDtos(result);
        }

        return List.of();
    }



    /**
     * Lấy các event và trạng thái request chờ duyệt mà user này tạo
     */
    public List<MyDraftEventDto> getMyDraftEvents(Long userId) {
        List<RequestStatus> statuses;
        if (roleService.isClubPresident(userId)) {
            statuses = List.of(RequestStatus.PENDING_UNIVERSITY);
        } else if (roleService.isClubOfficer(userId)) {
            statuses = List.of(RequestStatus.PENDING_CLUB);
        } else {
            return List.of();
        }
        List<RequestEvent> reqEvents = requestEventRepository.findByCreatedByIdAndStatusIn(userId, statuses);
        if (reqEvents == null || reqEvents.isEmpty()) return List.of();
        return reqEvents.stream()
            .filter(re -> re.getEvent() != null)
            .map(re -> MyDraftEventDto.builder()
                .event(eventMapper.toDto(re.getEvent()))
                .requestStatus(re.getStatus())
                .build())
            .toList();
    }

    @Transactional
    public EventData updateMyDraftEvent(Long eventId, UpdateEventRequest request, Long userId) {
        // Xác định status hợp lệ theo role
        List<RequestStatus> allowedStatuses;
        if (roleService.isClubPresident(userId)) {
            allowedStatuses = List.of(RequestStatus.PENDING_UNIVERSITY);
        } else if (roleService.isClubOfficer(userId)) {
            allowedStatuses = List.of(RequestStatus.PENDING_CLUB);
        } else {
            throw new ForbiddenException("Bạn không có quyền cập nhật sự kiện này");
        }

        RequestEvent requestEvent = requestEventRepository
                .findByEventIdAndCreatorWithEventAndStatusIn(eventId, userId, allowedStatuses)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện nháp của bạn hoặc trạng thái không phù hợp"));

        Event event = requestEvent.getEvent();
        if (event == null) {
            throw new NotFoundException("Event không tồn tại");
        }

        // Cập nhật các trường nếu có
        if (request.getTitle() != null) event.setTitle(request.getTitle());
        if (request.getDescription() != null) event.setDescription(request.getDescription());
        if (request.getLocation() != null) event.setLocation(request.getLocation());
        if (request.getStartTime() != null) event.setStartTime(request.getStartTime());
        if (request.getEndTime() != null) event.setEndTime(request.getEndTime());
        if (request.getEventTypeId() != null) {
            EventType eventType = getEventTypeById(request.getEventTypeId());
            event.setEventType(eventType);
        }

        // Nếu đổi sang MEETING thì publish ngay và chốt request
        boolean isMeetingNow = event.getEventType() != null &&
                "MEETING".equalsIgnoreCase(event.getEventType().getTypeName());
        if (isMeetingNow) {
            event.setIsDraft(false);
        }

        Event saved = eventRepository.save(event);

        if (request.getMediaFiles() != null && !request.getMediaFiles().isEmpty()) {
            uploadAndSaveEventMedia(saved, request.getMediaFiles()); // append ảnh mới
        }

        if (isMeetingNow) {
            requestEvent.setStatus(RequestStatus.APPROVED_UNIVERSITY);
            requestEvent.setResponseMessage("Auto-approved due to MEETING type change");
            requestEventRepository.save(requestEvent);
        }

        return eventMapper.toDto(saved);
    }

    @Transactional
    public void deleteMyDraftEvent(Long eventId, Long userId) {
        // Xác định status hợp lệ theo role
        List<RequestStatus> allowedStatuses;
        if (roleService.isClubPresident(userId)) {
            allowedStatuses = List.of(RequestStatus.PENDING_UNIVERSITY);
        } else if (roleService.isClubOfficer(userId)) {
            allowedStatuses = List.of(RequestStatus.PENDING_CLUB);
        } else {
            throw new ForbiddenException("Bạn không có quyền xóa sự kiện này");
        }

        RequestEvent requestEvent = requestEventRepository
                .findByEventIdAndCreatorWithEventAndStatusIn(eventId, userId, allowedStatuses)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện nháp của bạn hoặc trạng thái không phù hợp"));

        Event event = requestEvent.getEvent();
        if (event == null) {
            throw new NotFoundException("Event không tồn tại");
        }

        eventMediaRepository.deleteByEvent_Id(event.getId());
        requestEventRepository.delete(requestEvent);
        eventRepository.delete(event);
    }

    private List<PendingRequestDto> mapToPendingDtos(List<RequestEvent> requestEvents) {
        List<PendingRequestDto> dtos = new ArrayList<>();
        for (RequestEvent re : requestEvents) {
            Event e = re.getEvent();
            Club c = (e != null ? e.getClub() : null);
            User u = re.getCreatedBy();

            PendingRequestDto.EventSummaryDto eventDto = null;
            if (e != null) {
                eventDto = PendingRequestDto.EventSummaryDto.builder()
                        .id(e.getId())
                        .title(e.getTitle())
                        .startTime(e.getStartTime())
                        .endTime(e.getEndTime())
                        .location(e.getLocation())
                        .eventTypeName(e.getEventType() != null ? e.getEventType().getTypeName() : null)
                        .isDraft(Boolean.TRUE.equals(e.getIsDraft()))
                        .build();
            }

            PendingRequestDto.ClubMiniDto clubDto = null;
            if (c != null) {
                clubDto = PendingRequestDto.ClubMiniDto.builder()
                        .id(c.getId())
                        .name(c.getClubName())
                        .build();
            }

            PendingRequestDto.UserMiniDto userDto = null;
            if (u != null) {
                userDto = PendingRequestDto.UserMiniDto.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .build();
            }

           PendingRequestDto dto = PendingRequestDto.builder()
                    .requestEventId(re.getId())
                    .requestTitle(re.getRequestTitle())
                    .status(re.getStatus())
                    .responseMessage(re.getResponseMessage())
                    .description(re.getDescription())
                    .requestDate(re.getRequestDate())
                    .event(eventDto)
                    .club(clubDto)
                    .createdBy(userDto)
                    .build();
            dtos.add(dto);
        }
        return dtos;
    }
}
