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
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@Service
@AllArgsConstructor
public class NewsService {
    private final NewsRepository newsRepository;
    private final NewsMapper newsMapper;


    public NewsResponse getAllNewsByFilter(NewsRequest request) {
        Page<News> page = this.newsRepository.getAllNewsByFilter(request, request.getPageable());
        List<News> news = page.getContent();
        List<NewsData> list = news.stream()
                .map(newsItem -> {
                    NewsData dto = newsMapper.toDto(newsItem);
                    dto.setClubId(newsItem.getClub() != null ? newsItem.getClub().getId() : null);
                    return dto;
                })
                .collect(Collectors.toList());

        return NewsResponse.builder()
                .total(page.getTotalElements())
                .count(page.getNumberOfElements())
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
