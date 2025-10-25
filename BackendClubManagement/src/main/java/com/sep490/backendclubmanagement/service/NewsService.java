package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.NewsRequest;
import com.sep490.backendclubmanagement.dto.response.EventData;
import com.sep490.backendclubmanagement.dto.response.NewsData;
import com.sep490.backendclubmanagement.dto.response.NewsResponse;
import com.sep490.backendclubmanagement.entity.News;
import com.sep490.backendclubmanagement.exception.NotFoundException;
import com.sep490.backendclubmanagement.mapper.NewsMapper;
import com.sep490.backendclubmanagement.repository.NewsRepository;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@Service
@AllArgsConstructor
public class NewsService {
    private final NewsRepository newsRepository;
    private final NewsMapper newsMapper;


    public NewsResponse getAllNewsByFilter(NewsRequest request) {
        final List<String> keywords = (request.getKeyword() != null && !request.getKeyword().isBlank())
                ? Arrays.stream(request.getKeyword().split(","))
                .map(String::trim)
                .filter(k -> !k.isEmpty())
                .toList()
                : List.of();

        // 2️⃣ Lấy dữ liệu từ repository (lọc theo các điều kiện cơ bản)
        Page<News> page = this.newsRepository.getAllNewsByFilter(request, request.getPageable());
        List<News> newsList = page.getContent();

        // 3️⃣ Nếu có keyword thì lọc tiếp ở tầng Java
        if (!keywords.isEmpty()) {
            newsList = newsList.stream()
                    .filter(news -> {
                        String title = news.getTitle() != null ? news.getTitle().toLowerCase() : "";
                        String content = news.getContent() != null ? news.getContent().toLowerCase() : "";
                        String type = news.getNewsType() != null ? news.getNewsType().toLowerCase() : "";

                        // Ít nhất một keyword khớp với title, content hoặc news_type
                        return keywords.stream().anyMatch(kw ->
                                title.contains(kw.toLowerCase()) ||
                                        content.contains(kw.toLowerCase()) ||
                                        type.contains(kw.toLowerCase())
                        );
                    })
                    .toList();
        }

        // 4️⃣ Map sang DTO
        List<NewsData> list = newsList.stream()
                .map(newsItem -> {
                    NewsData dto = newsMapper.toDto(newsItem);
                    dto.setClubId(newsItem.getClub() != null ? newsItem.getClub().getId() : null);
                    return dto;
                })
                .toList();

        // 5️⃣ Trả về kết quả
        return NewsResponse.builder()
                .total(page.getTotalElements())  // tổng số trong DB (chưa lọc keyword)
                .count(list.size())              // số kết quả sau khi lọc keyword
                .data(list)
                .build();
    }

    public NewsData getNewsById(Long id) {
        Optional<News> news  = this.newsRepository.findById(id);
        if(news.isEmpty()){
            throw new NotFoundException("News not found");
        }
        return newsMapper.toDto(news.get());
    }
}
