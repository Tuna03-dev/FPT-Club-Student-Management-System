package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.EventRequest;
import com.sep490.backendclubmanagement.dto.response.ClubDto;
import com.sep490.backendclubmanagement.dto.response.EventData;
import com.sep490.backendclubmanagement.dto.response.EventResponse;
import com.sep490.backendclubmanagement.dto.response.EventTypesDto;
import com.sep490.backendclubmanagement.entity.Club;
import com.sep490.backendclubmanagement.entity.Event;
import com.sep490.backendclubmanagement.entity.EventType;
import com.sep490.backendclubmanagement.exception.NotFoundException;
import com.sep490.backendclubmanagement.mapper.EventMapper;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.EventMediaRepository;
import com.sep490.backendclubmanagement.repository.EventRepository;
import com.sep490.backendclubmanagement.shared.ModelMapperUtils;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Builder
@RequiredArgsConstructor
public class EventService {
    private final EventRepository eventRepository;
    private final EventMediaRepository eventMediaRepository;
    private final ClubMemberShipRepository clubMemberShipRepository;
    private final EventMapper eventMapper;
    private final MessageSource messageSource;

    public EventResponse getAllEventsByFilter(EventRequest request) {
        final List<String> keywords = (request.getKeyword() != null && !request.getKeyword().isBlank())
                ? Arrays.stream(request.getKeyword().split(","))
                .map(String::trim)
                .filter(k -> !k.isEmpty())
                .toList()
                : List.of();

        // 2️⃣ Lấy dữ liệu từ repository (lọc theo eventTypeId, clubId, thời gian, is_draft)
        Page<Event> page = this.eventRepository.getAllByFilter(request, request.getPageable());
        List<Event> events = page.getContent();

        // 3️⃣ Nếu có keyword thì lọc tiếp ở tầng Java
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

        // 4️⃣ Map sang DTO
        List<EventData> list = events.stream()
                .map(event -> {
                    EventData dto = eventMapper.toDto(event);
                    dto.setMediaUrls(eventMediaRepository.findMediaUrlsByEventId(event.getId()));
                    dto.setClubId(event.getClub() != null ? event.getClub().getId() : null);
                    return dto;
                })
                .toList();

        // 5️⃣ Trả về kết quả
        return EventResponse.builder()
                .total(page.getTotalElements())  // tổng số trong DB (chưa lọc keyword)
                .count(list.size())              // số kết quả sau khi lọc keyword
                .data(list)
                .build();
    }

    public List<EventTypesDto> getAllEventTypes() {
        List<EventType> eventTypes = eventRepository.findAllEventTypes();
        return ModelMapperUtils.mapList(eventTypes, EventTypesDto.class);
    }

    public EventData getEventById(Long id) {
        Optional<Event> event = eventRepository.findById(id);
        if(event.isEmpty()){
            throw new NotFoundException("Event not found");
        }
        EventData dto = eventMapper.toDto(event.get());
        dto.setMediaUrls(eventMediaRepository.findMediaUrlsByEventId(event.get().getId()));
        return dto;
    }

    public List<ClubDto> getAllClubs() {
        List<Club> clubs = eventRepository.findAllClubs();
        return ModelMapperUtils.mapList(clubs, ClubDto.class);
    }

    public List<EventData> getEventsByClubId(Long clubId, Long userId) {
        if (!clubMemberShipRepository.existsByClubIdAndUserIdAndStatusActive(clubId, userId)) {
            throw new NotFoundException("You are not a member of this club or your membership is not active");
        }
        return eventRepository.findByClubIdAndIsDraftFalse(clubId)
                .stream()
                .map(event -> {
                    EventData dto = eventMapper.toDto(event);
                    dto.setMediaUrls(eventMediaRepository.findMediaUrlsByEventId(event.getId()));
                    dto.setClubId(event.getClub() != null ? event.getClub().getId() : null);
                    return dto;
                })
                .toList();
    }
}
