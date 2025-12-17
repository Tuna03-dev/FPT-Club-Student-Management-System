package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.PageResp;
import com.sep490.backendclubmanagement.dto.response.PublicClubCardDTO;
import com.sep490.backendclubmanagement.dto.response.PublicClubDetailDTO;

public interface PublicClubService {
    PageResp<PublicClubCardDTO> list(String q, Long campusId, Long categoryId, int page, int size);
    PublicClubDetailDTO detail(Long clubId, String expand);
}
