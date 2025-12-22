package com.sep490.backendclubmanagement.unitservice;

import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.EventRepository;
import com.sep490.backendclubmanagement.repository.NewsRepository;
import com.sep490.backendclubmanagement.service.HomepageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomepageServiceTest {

    @Mock
    private ClubRepository clubRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private NewsRepository newsRepository;

    @InjectMocks
    private HomepageService homepageService;

    private FeaturedClubDTO featuredClub;
    private LatestNewsDTO latestNews;

    @BeforeEach
    void setup() {
        featuredClub = new FeaturedClubDTO(
                1L,
                "DEV Club",
                "logo.png",
                "Club description"
        );

        latestNews = new LatestNewsDTO(
                100L,
                "New Project Launch",
                "thumb.png",
                "Excerpt text...",
                LocalDateTime.now()
        );
    }

    @Test
    void getHomepageData_success() {
        // ===== STEP 1: Featured clubs auto update =====
        doNothing().when(clubRepository).resetAllFeatured();
        when(clubRepository.findTopClubIdsByEventCount(any(PageRequest.class)))
                .thenReturn(List.of(1L, 2L));
        doNothing().when(clubRepository).updateFeaturedClubs(anyList());

        // ===== STEP 2: Get featured clubs =====
        when(clubRepository.findFeaturedClubs())
                .thenReturn(List.of(featuredClub));

        // ===== STEP 3: Upcoming events (RAW Object[]) =====
        List<Object[]> rawEvents = new ArrayList<>();
        rawEvents.add(new Object[]{
                10L,
                "Hackathon",
                Timestamp.valueOf(LocalDateTime.now().plusDays(1)),
                "Hall A",
                "DEV Club",
                "event.png"
        });

        when(eventRepository.findUpcomingEventsRaw(any(LocalDateTime.class)))
                .thenReturn(rawEvents);

        // ===== STEP 4: Latest news =====
        when(newsRepository.findLatestNews(any(PageRequest.class)))
                .thenReturn(List.of(latestNews));

        // ===== STEP 4.5: Spotlight (NO DATA) =====
        when(newsRepository.findTopByIsDraftFalseOrderByCreatedAtDesc())
                .thenReturn(Optional.empty());
        when(newsRepository.findTopByIsSpotlightTrueOrderByCreatedAtDesc())
                .thenReturn(Optional.empty());

        // ===== ACT =====
        HomepageResponse response = homepageService.getHomepageData();

        // ===== ASSERT =====
        assertNotNull(response);

        // Featured clubs
        assertEquals(1, response.getFeaturedClubs().size());
        assertEquals(
                "DEV Club",
                response.getFeaturedClubs().get(0).getClubName()
        );

        // Upcoming events
        assertEquals(1, response.getUpcomingEvents().size());
        assertEquals(
                "Hackathon",
                response.getUpcomingEvents().get(0).getTitle()
        );

        // Latest news
        assertEquals(1, response.getLatestNews().size());
        assertEquals(
                "New Project Launch",
                response.getLatestNews().get(0).getTitle()
        );

        // Spotlight
        assertNull(response.getSpotlight());

        // ===== VERIFY =====
        verify(clubRepository).resetAllFeatured();
        verify(clubRepository)
                .findTopClubIdsByEventCount(any(PageRequest.class));
        verify(clubRepository).updateFeaturedClubs(anyList());
        verify(clubRepository).findFeaturedClubs();

        verify(eventRepository)
                .findUpcomingEventsRaw(any(LocalDateTime.class));

        verify(newsRepository)
                .findLatestNews(any(PageRequest.class));
        verify(newsRepository)
                .findTopByIsDraftFalseOrderByCreatedAtDesc();
        verify(newsRepository)
                .findTopByIsSpotlightTrueOrderByCreatedAtDesc();
    }
}
