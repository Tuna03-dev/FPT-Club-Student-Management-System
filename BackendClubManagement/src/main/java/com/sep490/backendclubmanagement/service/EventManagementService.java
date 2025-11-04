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
     * Lấy các event và trạng thái request chờ duyệt mà user này tạo (theo club)
     */
    public List<MyDraftEventDto> getMyDraftEvents(Long userId, Long clubId) {
        List<RequestStatus> statuses;
        
        // Check role theo clubId nếu có, nếu không thì check global role
        if (clubId != null && clubId > 0) {
            if (roleService.isClubPresident(userId, clubId)) {
                statuses = List.of(RequestStatus.PENDING_UNIVERSITY);
            } else if (roleService.isClubOfficer(userId, clubId)) {
                statuses = List.of(RequestStatus.PENDING_CLUB);
            } else {
                return List.of();
            }
        } else {
            // Fallback: check global role (for backward compatibility)
            if (roleService.isClubPresident(userId)) {
                statuses = List.of(RequestStatus.PENDING_UNIVERSITY);
            } else if (roleService.isClubOfficer(userId)) {
                statuses = List.of(RequestStatus.PENDING_CLUB);
            } else {
                return List.of();
            }
        }
        
        List<RequestEvent> reqEvents = requestEventRepository.findByCreatedByIdAndStatusIn(userId, statuses);
        if (reqEvents == null || reqEvents.isEmpty()) return List.of();
        
        // Filter by clubId if provided
        return reqEvents.stream()
            .filter(re -> re.getEvent() != null)
            .filter(re -> {
                if (clubId == null || clubId <= 0) return true;
                Event event = re.getEvent();
                if (event.getClub() == null) return clubId == null;
                return event.getClub().getId() != null && event.getClub().getId().equals(clubId);
            })
            .map(re -> MyDraftEventDto.builder()
                .event(eventMapper.toDto(re.getEvent()))
                .requestStatus(re.getStatus())
                .build())
            .toList();
    }

    @Transactional
    public EventData updateMyDraftEvent(Long eventId, UpdateEventRequest request, Long userId) {
        // Lấy event trước để check clubId
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện"));
        
        // Lấy clubId từ event
        Long clubId = event.getClub() != null ? event.getClub().getId() : null;

        // Trường hợp đặc biệt: Sự kiện đã publish, loại MEETING (nội bộ CLB)
        // Cho phép CHÍNH NGƯỜI TẠO (creator của RequestEvent) cập nhật trước khi bắt đầu
        boolean isMeeting = event.getEventType() != null &&
                "MEETING".equalsIgnoreCase(event.getEventType().getTypeName());
        if (Boolean.FALSE.equals(event.getIsDraft()) && isMeeting) {
            if (event.getStartTime().isBefore(LocalDateTime.now())) {
                throw new ForbiddenException("Sự kiện đã bắt đầu, không thể cập nhật");
            }
            // Ưu tiên xác thực theo creator của RequestEvent (nếu có)
            boolean isCreator = requestEventRepository
                    .findByEventIdAndCreatedById(eventId, userId)
                    .isPresent();
            boolean isClubLeader = (clubId != null) && (roleService.isClubPresident(userId, clubId) || roleService.isClubOfficer(userId, clubId));
            if (!isCreator && !isClubLeader) {
                throw new ForbiddenException("Bạn không có quyền cập nhật sự kiện này");
            }

            Event eventToUpdate = event; // dùng trực tiếp event đã lấy
            // Không cho đổi club và không cho đổi loại ra khỏi MEETING
            if (request.getEventTypeId() != null) {
                EventType newType = getEventTypeById(request.getEventTypeId());
                if (!"MEETING".equalsIgnoreCase(newType.getTypeName())) {
                    throw new ForbiddenException("Không thể đổi loại sự kiện MEETING thành loại khác sau khi đã công bố");
                }
                eventToUpdate.setEventType(newType);
            }
            if (request.getTitle() != null) eventToUpdate.setTitle(request.getTitle());
            if (request.getDescription() != null) eventToUpdate.setDescription(request.getDescription());
            if (request.getLocation() != null) eventToUpdate.setLocation(request.getLocation());
            if (request.getStartTime() != null) eventToUpdate.setStartTime(request.getStartTime());
            if (request.getEndTime() != null) eventToUpdate.setEndTime(request.getEndTime());

            Event savedMeeting = eventRepository.save(eventToUpdate);
            if (request.getMediaFiles() != null && !request.getMediaFiles().isEmpty()) {
                uploadAndSaveEventMedia(savedMeeting, request.getMediaFiles());
            }
            return eventMapper.toDto(savedMeeting);
        }
        
        // Xác định status hợp lệ theo role và clubId
        List<RequestStatus> allowedStatuses;
        if (clubId != null && clubId > 0) {
            // Check role theo clubId
            if (roleService.isClubPresident(userId, clubId)) {
                allowedStatuses = List.of(RequestStatus.PENDING_UNIVERSITY);
            } else if (roleService.isClubOfficer(userId, clubId)) {
                allowedStatuses = List.of(RequestStatus.PENDING_CLUB);
            } else {
                throw new ForbiddenException("Bạn không có quyền cập nhật sự kiện này");
            }
        } else {
            // Event toàn trường hoặc không có club - check global role
            if (roleService.isClubPresident(userId)) {
                allowedStatuses = List.of(RequestStatus.PENDING_UNIVERSITY);
            } else if (roleService.isClubOfficer(userId)) {
                allowedStatuses = List.of(RequestStatus.PENDING_CLUB);
            } else {
                throw new ForbiddenException("Bạn không có quyền cập nhật sự kiện này");
            }
        }

        RequestEvent requestEvent = requestEventRepository
                .findByEventIdAndCreatorWithEventAndStatusIn(eventId, userId, allowedStatuses)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện nháp của bạn hoặc trạng thái không phù hợp"));

        // Đảm bảo event từ requestEvent match với event đã lấy
        Event eventToUpdate = requestEvent.getEvent();
        if (eventToUpdate == null || !eventToUpdate.getId().equals(event.getId())) {
            throw new NotFoundException("Event không tồn tại hoặc không khớp");
        }

        // Cập nhật các trường nếu có (dùng event từ requestEvent để đảm bảo consistency)
        if (request.getTitle() != null) eventToUpdate.setTitle(request.getTitle());
        if (request.getDescription() != null) eventToUpdate.setDescription(request.getDescription());
        if (request.getLocation() != null) eventToUpdate.setLocation(request.getLocation());
        if (request.getStartTime() != null) eventToUpdate.setStartTime(request.getStartTime());
        if (request.getEndTime() != null) eventToUpdate.setEndTime(request.getEndTime());
        if (request.getEventTypeId() != null) {
            EventType eventType = getEventTypeById(request.getEventTypeId());
            eventToUpdate.setEventType(eventType);
        }

        // Nếu đổi sang MEETING thì publish ngay và chốt request
        boolean isMeetingNow = eventToUpdate.getEventType() != null &&
                "MEETING".equalsIgnoreCase(eventToUpdate.getEventType().getTypeName());
        if (isMeetingNow) {
            eventToUpdate.setIsDraft(false);
        }

        Event saved = eventRepository.save(eventToUpdate);

        if (request.getMediaFiles() != null && !request.getMediaFiles().isEmpty()) {
            uploadAndSaveEventMedia(saved, request.getMediaFiles()); // append ảnh mới
        }

        if (isMeetingNow) {
            requestEvent.setStatus(RequestStatus.APPROVED_UNIVERSITY);
            requestEvent.setResponseMessage("Auto-approved due to MEETING type change");
            // Đồng bộ tiêu đề/mô tả lần cuối trước khi chốt
            requestEvent.setRequestTitle(saved.getTitle());
            requestEvent.setDescription(saved.getDescription());
            requestEventRepository.save(requestEvent);
        }
        else {
            // Đồng bộ request title/description với bản nháp đã cập nhật
            if (request.getTitle() != null) requestEvent.setRequestTitle(saved.getTitle());
            if (request.getDescription() != null) requestEvent.setDescription(saved.getDescription());
            requestEventRepository.save(requestEvent);
        }

        return eventMapper.toDto(saved);
    }

    @Transactional
    public void deleteMyDraftEvent(Long eventId, Long userId) {
        // Lấy event trước để check clubId
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện"));
        
        // Lấy clubId từ event
        Long clubId = event.getClub() != null ? event.getClub().getId() : null;

        // Trường hợp đặc biệt: MEETING đã publish — cho phép creator xóa trước khi bắt đầu
        boolean isMeeting = event.getEventType() != null &&
                "MEETING".equalsIgnoreCase(event.getEventType().getTypeName());
        if (Boolean.FALSE.equals(event.getIsDraft()) && isMeeting) {
            if (event.getStartTime().isBefore(LocalDateTime.now())) {
                throw new ForbiddenException("Sự kiện đã bắt đầu, không thể xóa");
            }
            boolean isCreator = requestEventRepository
                    .findByEventIdAndCreatedById(eventId, userId)
                    .isPresent();
            boolean isClubLeader = (clubId != null) && (roleService.isClubPresident(userId, clubId) || roleService.isClubOfficer(userId, clubId));
            if (!isCreator && !isClubLeader) {
                throw new ForbiddenException("Bạn không có quyền xóa sự kiện này");
            }
            // Xóa media, request (nếu có), và sự kiện
            eventMediaRepository.deleteByEvent_Id(event.getId());
            requestEventRepository.findByEventId(eventId).ifPresent(requestEventRepository::delete);
            eventRepository.delete(event);
            return;
        }
        
        // Xác định status hợp lệ theo role và clubId
        List<RequestStatus> allowedStatuses;
        if (clubId != null && clubId > 0) {
            // Check role theo clubId
            if (roleService.isClubPresident(userId, clubId)) {
                allowedStatuses = List.of(RequestStatus.PENDING_UNIVERSITY);
            } else if (roleService.isClubOfficer(userId, clubId)) {
                allowedStatuses = List.of(RequestStatus.PENDING_CLUB);
            } else {
                throw new ForbiddenException("Bạn không có quyền xóa sự kiện này");
            }
        } else {
            // Event toàn trường hoặc không có club - check global role
            if (roleService.isClubPresident(userId)) {
                allowedStatuses = List.of(RequestStatus.PENDING_UNIVERSITY);
            } else if (roleService.isClubOfficer(userId)) {
                allowedStatuses = List.of(RequestStatus.PENDING_CLUB);
            } else {
                throw new ForbiddenException("Bạn không có quyền xóa sự kiện này");
            }
        }

        RequestEvent requestEvent = requestEventRepository
                .findByEventIdAndCreatorWithEventAndStatusIn(eventId, userId, allowedStatuses)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện nháp của bạn hoặc trạng thái không phù hợp"));

        if (requestEvent.getEvent() == null) {
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
