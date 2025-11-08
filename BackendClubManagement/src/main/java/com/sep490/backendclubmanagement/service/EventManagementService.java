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

        // STAFF tạo event ở trạng thái draft, cần publish sau
        // MEETING vẫn public ngay
        boolean shouldBeDraft = isStaff && !isMeeting;
        
        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .club(club)
                .eventType(eventType)
                .isDraft(shouldBeDraft)
                .build();
        
        Event savedEvent = eventRepository.save(event);
        
        if (request.getMediaFiles() != null && !request.getMediaFiles().isEmpty()) {
            uploadAndSaveEventMedia(savedEvent, request.getMediaFiles());
        }
        
        if (isMeeting) {
            log.info("Event created directly (MEETING)");
            return eventMapper.toDto(savedEvent);
        } else if (isStaff) {
            log.info("Event created as draft (STAFF)");
            return eventMapper.toDto(savedEvent);
        } else if (isClubPresident) {
            // CLUB_OFFICER: Gửi lên STAFF
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
            // TEAM_OFFICER: Gửi lên CLUB_OFFICER
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
                String contentType = file.getContentType();
                boolean isVideo = contentType != null && contentType.startsWith("video/");
                
                CloudinaryService.UploadResult uploadResult;
                MediaType mediaType;
                
                if (isVideo) {
                    uploadResult = cloudinaryService.uploadVideo(file, "club/events");
                    mediaType = MediaType.VIDEO;
                } else {
                    uploadResult = cloudinaryService.uploadImage(file, "club/events");
                    mediaType = MediaType.IMAGE;
                }
                
                EventMedia eventMedia = EventMedia.builder()
                        .event(event)
                        .mediaUrl(uploadResult.url())
                        .mediaType(mediaType)
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
            throw new ForbiddenException("Chỉ CLUB_OFFICER mới có quyền duyệt");
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
     * Hoặc draft events của STAFF (không có club)
     */
    public List<MyDraftEventDto> getMyDraftEvents(Long userId, Long clubId) {
        // STAFF: Lấy draft events không có club (toàn trường)
        // STAFF tạo event không có RequestEvent, chỉ có isDraft = true và clubId = null
        if (roleService.isStaff(userId)) {
            List<Event> staffDrafts = eventRepository.findByIsDraftTrueAndClubIsNull();
            return staffDrafts.stream()
                .filter(e -> {
                    // Chỉ lấy events do user này tạo (thông qua RequestEvent hoặc trực tiếp)
                    // Vì STAFF tạo event không có RequestEvent, cần check creator
                    // Tạm thời lấy tất cả draft events không có club (vì không có createdBy trong Event)
                    // Có thể cần thêm field createdBy vào Event entity sau
                    return true;
                })
                .map(e -> MyDraftEventDto.builder()
                    .event(eventMapper.toDto(e))
                    .requestStatus(null) // STAFF draft events không có RequestStatus
                    .build())
                .toList();
        }
        
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

        // STAFF: Update draft events (isDraft = true, club = null) hoặc published events (isDraft = false, club = null)
        if (event.getClub() == null && roleService.isStaff(userId)) {
            // Draft events: cho phép update bất cứ lúc nào
            // Published events: chỉ cho update trước khi bắt đầu
            if (Boolean.FALSE.equals(event.getIsDraft()) && event.getStartTime().isBefore(LocalDateTime.now())) {
                throw new ForbiddenException("Sự kiện đã bắt đầu, không thể cập nhật");
            }
            Event eventToUpdate = event;
            if (request.getTitle() != null) eventToUpdate.setTitle(request.getTitle());
            if (request.getDescription() != null) eventToUpdate.setDescription(request.getDescription());
            if (request.getLocation() != null) eventToUpdate.setLocation(request.getLocation());
            if (request.getStartTime() != null) eventToUpdate.setStartTime(request.getStartTime());
            if (request.getEndTime() != null) eventToUpdate.setEndTime(request.getEndTime());
            if (request.getEventTypeId() != null) {
                EventType newType = getEventTypeById(request.getEventTypeId());
                eventToUpdate.setEventType(newType);
            }
            Event savedStaffEvent = eventRepository.save(eventToUpdate);
            
            // Xóa media cũ nếu có
            if (request.getDeleteMediaIds() != null && !request.getDeleteMediaIds().isEmpty()) {
                eventMediaRepository.deleteAllById(request.getDeleteMediaIds());
            }
            
            // Thêm media mới nếu có
            if (request.getMediaFiles() != null && !request.getMediaFiles().isEmpty()) {
                uploadAndSaveEventMedia(savedStaffEvent, request.getMediaFiles());
            }
            return eventMapper.toDto(savedStaffEvent);
        }


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
            
            // Xóa media cũ nếu có
            if (request.getDeleteMediaIds() != null && !request.getDeleteMediaIds().isEmpty()) {
                eventMediaRepository.deleteAllById(request.getDeleteMediaIds());
            }
            
            // Thêm media mới nếu có
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

        // STAFF: Delete draft events (isDraft = true, club = null) hoặc published events (isDraft = false, club = null)
        if (event.getClub() == null && roleService.isStaff(userId)) {
            // Draft events: cho phép xóa bất cứ lúc nào
            // Published events: chỉ cho xóa trước khi bắt đầu
            if (Boolean.FALSE.equals(event.getIsDraft()) && event.getStartTime().isBefore(LocalDateTime.now())) {
                throw new ForbiddenException("Sự kiện đã bắt đầu, không thể xóa");
            }
            eventMediaRepository.deleteByEvent_Id(event.getId());
            requestEventRepository.findByEventId(eventId).ifPresent(requestEventRepository::delete);
            eventRepository.delete(event);
            return;
        }

        // Trường hợp đặc biệt B: MEETING đã publish — cho phép creator xóa trước khi bắt đầu
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

    // ================= STAFF Cancel/Restore =================
    @Transactional
    public void cancelClubEventByStaff(Long eventId, Long userId, String reason) {
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền hủy sự kiện");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện"));
        if (event.getClub() == null) {
            throw new ForbiddenException("Chỉ hủy được sự kiện của CLB");
        }
        if (event.getStartTime().isBefore(LocalDateTime.now())) {
            throw new ForbiddenException("Sự kiện đã bắt đầu, không thể hủy");
        }
        event.setIsDraft(true);
        eventRepository.save(event);
        // Optionally: lưu reason vào requestEvent nếu tồn tại
        requestEventRepository.findByEventId(eventId).ifPresent(re -> {
            re.setResponseMessage(reason);
            requestEventRepository.save(re);
        });
    }

    @Transactional
    public void restoreCancelledEventByStaff(Long eventId, Long userId) {
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền khôi phục sự kiện");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện"));
        if (event.getClub() == null) {
            throw new ForbiddenException("Chỉ khôi phục được sự kiện của CLB");
        }
        if (event.getStartTime().isBefore(LocalDateTime.now())) {
            throw new ForbiddenException("Sự kiện đã bắt đầu, không thể khôi phục");
        }
        event.setIsDraft(false);
        eventRepository.save(event);
    }

    @Transactional
    public EventData publishEventByStaff(Long eventId, Long userId) {
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền publish sự kiện");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện"));
        
        // Chỉ publish được event draft do STAFF tạo (không có club hoặc club = null)
        if (event.getClub() != null) {
            throw new ForbiddenException("Chỉ publish được sự kiện toàn trường (không thuộc CLB)");
        }
        
        if (Boolean.FALSE.equals(event.getIsDraft())) {
            throw new ForbiddenException("Sự kiện đã được publish rồi");
        }
        
        event.setIsDraft(false);
        Event saved = eventRepository.save(event);
        return eventMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<EventData> getStaffCancelledEvents(Long userId, Long clubId) {
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền xem danh sách đã hủy");
        }
        List<Event> list;
        List<RequestStatus> pending = java.util.List.of(RequestStatus.PENDING_CLUB, RequestStatus.PENDING_UNIVERSITY);
        if (clubId != null && clubId > 0) {
            list = eventRepository.findCancelledByStaffAndClubIdExcludingPending(clubId, pending);
        } else {
            list = eventRepository.findCancelledByStaffExcludingPending(pending);
        }
        return list.stream().map(e -> {
            EventData dto = eventMapper.toDto(e);
            List<EventMedia> mediaList = eventMediaRepository.findByEventIdOrderByDisplayOrder(e.getId());
            dto.setMediaUrls(mediaList.stream().map(EventMedia::getMediaUrl).toList());
            dto.setMediaTypes(mediaList.stream().map(m -> m.getMediaType() != null ? m.getMediaType().name() : "IMAGE").toList());
            dto.setMediaIds(mediaList.stream().map(EventMedia::getId).toList());
            dto.setClubId(e.getClub() != null ? e.getClub().getId() : null);
            return dto;
        }).toList();
    }

    @Transactional
    public void staffHardDeleteCancelledEvent(Long eventId, Long userId) {
        if (!roleService.isStaff(userId)) {
            throw new ForbiddenException("Chỉ STAFF mới có quyền xóa vĩnh viễn sự kiện");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sự kiện"));
        if (event.getClub() == null) {
            throw new ForbiddenException("Chỉ xóa các sự kiện của CLB");
        }
        if (!Boolean.TRUE.equals(event.getIsDraft())) {
            throw new ForbiddenException("Chỉ xóa được sự kiện đang ở trạng thái đã hủy (draft)");
        }
        // Xóa media và request liên quan rồi xóa event
        eventMediaRepository.deleteByEvent_Id(event.getId());
        requestEventRepository.findByEventId(eventId).ifPresent(requestEventRepository::delete);
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
