package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.News;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.EventRepository;
import com.sep490.backendclubmanagement.repository.NewsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HomepageService {

    private final ClubRepository clubRepository;
    private final EventRepository eventRepository;
    private final NewsRepository newsRepository;

    public HomepageResponse getHomepageData() {

        // 🔹 1. CLB nổi bật (4)
        List<FeaturedClubDTO> featuredClubs = clubRepository.findFeaturedClubs().stream()
                .limit(4)
                .toList();

        // 🔹 2. Sự kiện sắp diễn ra (4)
        List<UpcomingEventDTO> upcomingEvents = eventRepository.findUpcomingEvents(
                LocalDateTime.now(), PageRequest.of(0, 4));

        // 🔹 3. Tin tức mới nhất (4)
        List<LatestNewsDTO> latestNews = newsRepository.findLatestNews(PageRequest.of(0, 4));

        // 🔹 4. Spotlight (1 tin nổi bật nhất)
        SpotlightDTO spotlight = newsRepository.findTopByIsSpotlightTrueOrderByCreatedAtDesc()
                .map(news -> SpotlightDTO.builder()
                        .type(news.getNewsType())
                        .title(news.getTitle())
                        .description(news.getContent().length() > 150
                                ? news.getContent().substring(0, 150) + "..."
                                : news.getContent())
                        .imageUrl(news.getThumbnailUrl())
                        .callToActionText("Read more")
                        .callToActionLink("/news/" + news.getId())
                        .build())
                .orElse(null);

        // 🔹 5. Trả về tất cả dữ liệu
        return new HomepageResponse(featuredClubs, upcomingEvents, latestNews, spotlight);
    }
}