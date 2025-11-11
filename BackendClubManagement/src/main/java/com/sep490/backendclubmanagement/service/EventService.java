package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.BatchMarkAttendanceRequest;
import com.sep490.backendclubmanagement.dto.request.EventRequest;
import com.sep490.backendclubmanagement.dto.response.ClubDto;
import com.sep490.backendclubmanagement.dto.response.EventData;
import com.sep490.backendclubmanagement.dto.response.EventRegistrationDto;
import com.sep490.backendclubmanagement.dto.response.EventResponse;
import com.sep490.backendclubmanagement.dto.response.EventTypesDto;
import com.sep490.backendclubmanagement.entity.AttendanceStatus;
import com.sep490.backendclubmanagement.dto.response.EventWithoutReportRequirementDto;
import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.entity.Event;
import com.sep490.backendclubmanagement.entity.EventAttendance;
import com.sep490.backendclubmanagement.entity.EventType;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.exception.NotFoundException;
import com.sep490.backendclubmanagement.mapper.EventMapper;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.EventAttendanceRepository;
import com.sep490.backendclubmanagement.repository.EventMediaRepository;
import com.sep490.backendclubmanagement.entity.EventMedia;
import com.sep490.backendclubmanagement.repository.EventRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import com.sep490.backendclubmanagement.shared.ModelMapperUtils;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Builder
@RequiredArgsConstructor
public class EventService {
    private final EventRepository eventRepository;
    private final EventMediaRepository eventMediaRepository;
    private final ClubMemberShipRepository clubMemberShipRepository;
    private final EventAttendanceRepository eventAttendanceRepository;
    private final UserRepository userRepository;
    private final EventMapper eventMapper;
    private final MessageSource messageSource;

    public EventResponse getAllEventsByFilter(EventRequest request) {
        final List<String> keywords = (request.getKeyword() != null && !request.getKeyword().isBlank())
                ? Arrays.stream(request.getKeyword().split(","))
                .map(String::trim)
                .filter(k -> !k.isEmpty())
                .toList()
                : List.of();

        Page<Event> page = this.eventRepository.getAllByFilter(request, request.getPageable());
        List<Event> events = page.getContent();


        if (!keywords.isEmpty()) {
            events = events.stream()
                    .filter(event -> {
                        String title = event.getTitle() != null ? event.getTitle().toLowerCase() : "";
                        String desc = event.getDescription() != null ? event.getDescription().toLowerCase() : "";
                        String loc = event.getLocation() != null ? event.getLocation().toLowerCase() : "";

                        // Ít nhất một keyword khớp
                        return keywords.stream().anyMatch(kw ->
                                title.contains(kw.toLowerCase()) ||
                                        desc.contains(kw.toLowerCase()) ||
                                        loc.contains(kw.toLowerCase())
                        );
                    })
                    .toList();
        }


        List<EventData> list = events.stream()
                .map(event -> {
                    EventData dto = eventMapper.toDto(event);
                    dto.setClubId(event.getClub() != null ? event.getClub().getId() : null);
                    return dto;
                })
                .toList();
        setMediaUrlsAndTypesBatch(list, events.stream().map(Event::getId).toList());


        return EventResponse.builder()
                .total(page.getTotalElements())
                .count(list.size())
                .data(list)
                .build();
    }

    public List<EventTypesDto> getAllEventTypes() {
        List<EventType> eventTypes = eventRepository.findAllEventTypes();
        return ModelMapperUtils.mapList(eventTypes, EventTypesDto.class);
    }

    private void setMediaUrlsAndTypes(EventData dto, Long eventId) {
        List<EventMedia> mediaList = eventMediaRepository.findByEventIdOrderByDisplayOrder(eventId);
        dto.setMediaUrls(mediaList.stream().map(EventMedia::getMediaUrl).toList());
        dto.setMediaTypes(mediaList.stream().map(m -> m.getMediaType() != null ? m.getMediaType().name() : "IMAGE").toList());
        dto.setMediaIds(mediaList.stream().map(EventMedia::getId).toList());
    }

    private void setMediaUrlsAndTypesBatch(List<EventData> dtos, List<Long> eventIds) {
        if (dtos == null || dtos.isEmpty() || eventIds == null || eventIds.isEmpty()) return;
        List<EventMedia> allMedia = eventMediaRepository.findByEventIdInOrderByDisplayOrder(eventIds);
        Map<Long, List<EventMedia>> byEventId = allMedia.stream()
                .collect(Collectors.groupingBy(em -> em.getEvent().getId(), LinkedHashMap::new, Collectors.toList()));
        Map<Long, EventData> dtoById = dtos.stream().collect(Collectors.toMap(EventData::getId, d -> d));
        for (Map.Entry<Long, List<EventMedia>> entry : byEventId.entrySet()) {
            EventData dto = dtoById.get(entry.getKey());
            if (dto == null) continue;
            List<EventMedia> mediaList = entry.getValue();
            dto.setMediaUrls(mediaList.stream().map(EventMedia::getMediaUrl).toList());
            dto.setMediaTypes(mediaList.stream().map(m -> m.getMediaType() != null ? m.getMediaType().name() : "IMAGE").toList());
            dto.setMediaIds(mediaList.stream().map(EventMedia::getId).toList());
        }
    }

    public EventData getEventById(Long id) {
        Optional<Event> event = eventRepository.findById(id);
        if(event.isEmpty()){
            throw new NotFoundException("Event not found");
        }
        EventData dto = eventMapper.toDto(event.get());
        setMediaUrlsAndTypes(dto, event.get().getId());
        return dto;
    }

    public List<ClubDto> getAllClubs() {
        List<Club> clubs = eventRepository.findAllClubs();
        return ModelMapperUtils.mapList(clubs, ClubDto.class);
    }

    public List<EventData> getEventsByClubId(Long clubId, Long userId, String startTime, String endTime) {
        if (!clubMemberShipRepository.existsByClubIdAndUserIdAndStatusActive(clubId, userId)) {
            throw new NotFoundException("You are not a member of this club or your membership is not active");
        }
        LocalDateTime start = parseIsoDateTimeNullable(startTime);
        LocalDateTime end = parseIsoDateTimeNullable(endTime);
        List<Event> events = (start == null || end == null)
                ? eventRepository.findByClubIdAndIsDraftFalse(clubId)
                : eventRepository.findByClubIdAndIsDraftFalseInRange(clubId, start, end);
        List<EventData> list = events.stream()
                .map(event -> {
                    EventData dto = eventMapper.toDto(event);
                    dto.setClubId(event.getClub() != null ? event.getClub().getId() : null);
                    return dto;
                })
                .toList();
        setMediaUrlsAndTypesBatch(list, events.stream().map(Event::getId).toList());
        return list;
    }


    public List<EventData> getStaffAllEvents(String startTime, String endTime) {
        LocalDateTime start = parseIsoDateTimeNullable(startTime);
        LocalDateTime end = parseIsoDateTimeNullable(endTime);
        List<Event> events = (start == null || end == null)
                ? eventRepository.findStaffAllEventsExcludingMeeting()
                : eventRepository.findStaffAllEventsExcludingMeetingInRange(start, end);
        List<EventData> list = events.stream()
                .map(event -> {
                    EventData dto = eventMapper.toDto(event);
                    dto.setClubId(event.getClub() != null ? event.getClub().getId() : null);
                    return dto;
                })
                .toList();
        setMediaUrlsAndTypesBatch(list, events.stream().map(Event::getId).toList());
        return list;
    }


    public List<EventData> getStaffEventsByClubId(Long clubId, String startTime, String endTime) {
        LocalDateTime start = parseIsoDateTimeNullable(startTime);
        LocalDateTime end = parseIsoDateTimeNullable(endTime);
        List<Event> events = (start == null || end == null)
                ? eventRepository.findStaffEventsByClubIdExcludingMeeting(clubId)
                : eventRepository.findStaffEventsByClubIdExcludingMeetingInRange(clubId, start, end);
        List<EventData> list = events.stream()
                .map(event -> {
                    EventData dto = eventMapper.toDto(event);
                    dto.setClubId(event.getClub() != null ? event.getClub().getId() : null);
                    return dto;
                })
                .toList();
        setMediaUrlsAndTypesBatch(list, events.stream().map(Event::getId).toList());
        return list;
    }

    private LocalDateTime parseIsoDateTimeNullable(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            // Support ISO strings with 'Z' or timezone offset
            java.time.OffsetDateTime odt = java.time.OffsetDateTime.parse(value);
            return odt.toLocalDateTime();
        } catch (java.time.format.DateTimeParseException ex) {
            // Fallback to LocalDateTime without zone if provided
            return LocalDateTime.parse(value);
        }
    }


    public void registerForEvent(Long eventId, Long userId) {
        // Kiểm tra event tồn tại
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        
        // Kiểm tra event đã được publish chưa
        if (event.getIsDraft() != null && event.getIsDraft()) {
            throw new RuntimeException("Cannot register for draft event");
        }
        
        // Cho phép MEETING đăng ký trong khi đang diễn ra; các loại khác chỉ trước khi bắt đầu
        LocalDateTime now = LocalDateTime.now();
        boolean isMeeting = event.getEventType() != null &&
                event.getEventType().getTypeName() != null &&
                "MEETING".equalsIgnoreCase(event.getEventType().getTypeName());
        if (event.getStartTime() != null) {
            boolean hasStarted = event.getStartTime().isBefore(now);
            if (hasStarted && !isMeeting) {
                throw new RuntimeException("Cannot register for event that has already started");
            }
        }
        if (event.getEndTime() != null && event.getEndTime().isBefore(now)) {
            throw new RuntimeException("Cannot register for event that has already ended");
        }

        // Kiểm tra user tồn tại
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        
        // Kiểm tra đã đăng ký chưa
        if (eventAttendanceRepository.existsByEventIdAndUserId(eventId, userId)) {
            throw new RuntimeException("You have already registered for this event");
        }
        
        // Tạo event attendance với status REGISTERED
        EventAttendance eventAttendance = EventAttendance.builder()
                .event(event)
                .user(user)
                .registrationTime(LocalDateTime.now())
                .attendanceStatus(AttendanceStatus.REGISTERED)
                .build();
        
        eventAttendanceRepository.save(eventAttendance);
    }


    public void cancelEventRegistration(Long eventId, Long userId) {
        // Kiểm tra đã đăng ký chưa
        EventAttendance eventAttendance = eventAttendanceRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new NotFoundException("You have not registered for this event"));
        
        // Kiểm tra event đã bắt đầu chưa
        Event event = eventAttendance.getEvent();
        if (event.getStartTime() != null && event.getStartTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot cancel registration for event that has already started");
        }
        
        // Xóa đăng ký
        eventAttendanceRepository.delete(eventAttendance);
    }


    public boolean isUserRegisteredForEvent(Long eventId, Long userId) {
        return eventAttendanceRepository.existsByEventIdAndUserId(eventId, userId);
    }


    public List<EventRegistrationDto> getEventRegistrations(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        
        List<EventAttendance> attendances = eventAttendanceRepository.findByEventId(eventId);
        
        return attendances.stream()
                .map(attendance -> {
                    User user = attendance.getUser();
                    return EventRegistrationDto.builder()
                            .id(attendance.getId())
                            .userId(user.getId())
                            .fullName(user.getFullName())
                            .studentCode(user.getStudentCode())
                            .email(user.getEmail())
                            .avatarUrl(user.getAvatarUrl())
                            .registrationTime(attendance.getRegistrationTime())
                            .attendanceStatus(attendance.getAttendanceStatus() != null 
                                    ? attendance.getAttendanceStatus().name() 
                                    : null)
                            .checkInTime(attendance.getCheckInTime())
                            .notes(attendance.getNotes())
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<EventRegistrationDto> getEventRegistrations(Long eventId, String keyword) {
        List<EventRegistrationDto> list = getEventRegistrations(eventId);
        if (keyword == null || keyword.isBlank()) return list;
        String kw = keyword.trim().toLowerCase();
        return list.stream()
                .filter(r -> {
                    String name = r.getFullName() != null ? r.getFullName().toLowerCase() : "";
                    String code = r.getStudentCode() != null ? r.getStudentCode().toLowerCase() : "";
                    return name.contains(kw) || code.contains(kw);
                })
                .toList();
    }


    public Long getEventRegistrationCount(Long eventId) {
        return eventAttendanceRepository.countByEventIdAndStatus(eventId);
    }


    @Transactional
    public void batchMarkAttendance(Long eventId, List<BatchMarkAttendanceRequest.AttendanceItem> attendances) {
        // Kiểm tra event tồn tại và thuộc club
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        
        // Kiểm tra event thuộc club nào
        if (event.getClub() == null) {
            throw new NotFoundException("Event không thuộc về club nào");
        }
        
        // Không cho điểm danh nếu sự kiện đã kết thúc quá 1 ngày
        if (event.getEndTime() != null && event.getEndTime().isBefore(LocalDateTime.now().minusDays(1))) {
            throw new RuntimeException("Event ended more than 1 day ago. Attendance can no longer be modified");
        }
        
        if (attendances == null || attendances.isEmpty()) {
            throw new RuntimeException("Danh sách điểm danh không được rỗng");
        }
        
        List<EventAttendance> updatedAttendances = new ArrayList<>();
        
        for (BatchMarkAttendanceRequest.AttendanceItem item : attendances) {
            // Kiểm tra status hợp lệ
            if (item.getAttendanceStatus() != AttendanceStatus.PRESENT && 
                item.getAttendanceStatus() != AttendanceStatus.ABSENT) {
                throw new RuntimeException("Chỉ có thể điểm danh PRESENT hoặc ABSENT cho userId: " + item.getUserId());
            }
            
            // Kiểm tra user đã đăng ký event chưa
            EventAttendance attendance = eventAttendanceRepository.findByEventIdAndUserId(eventId, item.getUserId())
                    .orElseThrow(() -> new NotFoundException("User với ID " + item.getUserId() + " chưa đăng ký sự kiện này"));
            
            // Cập nhật điểm danh
            attendance.setAttendanceStatus(item.getAttendanceStatus());
            attendance.setCheckInTime(item.getAttendanceStatus() == AttendanceStatus.PRESENT ? LocalDateTime.now() : null);
            attendance.setNotes(item.getNotes());
            
            updatedAttendances.add(attendance);
        }
        
        eventAttendanceRepository.saveAll(updatedAttendances);
    }

    /**
     * Lấy danh sách events chưa được yêu cầu nộp báo cáo
     * @return Danh sách events với id, tên event, id và tên club
     */
    public List<EventWithoutReportRequirementDto> getEventsWithoutReportRequirement() {
        return eventRepository.findEventsWithoutReportRequirement();
    }
}
