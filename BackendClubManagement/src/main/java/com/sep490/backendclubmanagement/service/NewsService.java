package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.NewsRequest;
import com.sep490.backendclubmanagement.dto.response.NewsData;
import com.sep490.backendclubmanagement.dto.response.NewsResponse;
import com.sep490.backendclubmanagement.entity.News;
import com.sep490.backendclubmanagement.repository.NewsRepository;
import com.sep490.backendclubmanagement.shared.ModelMapperUtils;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;


@Service
@AllArgsConstructor

public class NewsService {
    private  final NewsRepository newsRepository;


    public NewsResponse getAllNewsByFilter(NewsRequest request) {
        Page<News> page = this.newsRepository.getAllNewsByFilter(request, request.getPageable());
        List<News> news = page.getContent();
        List<NewsData> list = news.stream()
                .map(newItem -> {
                    NewsData dto = ModelMapperUtils.mapper(newItem, NewsData.class);
                    dto.setClubId(newItem.getClub() != null ? newItem.getClub().getId() : null);
                    return dto;
                })
                .collect(Collectors.toList());

        return NewsResponse.builder()
                .total(page.getTotalElements())
                .count(page.getNumberOfElements())
                .data(list)
                .build();
    }
}
