package com.sep490.backendclubmanagement.mapper;

import com.sep490.backendclubmanagement.dto.response.NewsData;
import com.sep490.backendclubmanagement.entity.News;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.time.format.DateTimeFormatter;

@Mapper(componentModel = "spring")
public interface NewsMapper {

    // map field club.id → clubId
    @Mapping(source = "club.id", target = "clubId")
    @Mapping(source = "club.clubName", target = "clubName")
    
    // convert updatedAt → string
    @Mapping(source = "updatedAt", target = "updatedAt", qualifiedByName = "toStringTime")
    
    NewsData toDto(News news);

    // custom converter cho time
    @Named("toStringTime")
    static String toStringTime(java.time.LocalDateTime time) {
        if (time == null) return null;
        return time.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
