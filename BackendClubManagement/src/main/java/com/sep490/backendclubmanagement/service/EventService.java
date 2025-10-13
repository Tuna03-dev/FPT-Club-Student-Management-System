package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.EventRequest;
import com.sep490.backendclubmanagement.dto.response.EventData;
import com.sep490.backendclubmanagement.dto.response.EventResponse;
import com.sep490.backendclubmanagement.entity.Event;
import com.sep490.backendclubmanagement.mapper.EventMapper;
import com.sep490.backendclubmanagement.repository.EventMediaRepository;
import com.sep490.backendclubmanagement.repository.EventRepository;
import com.sep490.backendclubmanagement.shared.ModelMapperUtils;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Builder
@RequiredArgsConstructor
public class EventService {
    private final EventRepository eventRepository;
    private final EventMediaRepository eventMediaRepository;
    private final EventMapper eventMapper;

    public EventResponse getAllEventsByFilter(EventRequest request) {
        Page<Event> page = this.eventRepository.getAllByFilter(request, request.getPageable());
        List<Event> events = page.getContent();

        List<EventData> list = events.stream()
                .map(event -> {
//                    EventData dto = ModelMapperUtils.mapper(event, EventData.class);
                    EventData dto = eventMapper.toDto(event);
                    dto.setMediaUrls(eventMediaRepository.findMediaUrlsByEventId(event.getId()));
                    dto.setClubId(event.getClub() != null ? event.getClub().getId() : null);
                    return dto;
                })
                .collect(Collectors.toList());

        return EventResponse.builder()
                .total(page.getTotalElements())
                .count(page.getNumberOfElements())
                .data(list)
                .build();
    }
}
