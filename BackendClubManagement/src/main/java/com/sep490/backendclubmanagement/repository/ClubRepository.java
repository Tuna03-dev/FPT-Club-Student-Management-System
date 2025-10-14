// Trong: repository/ClubRepository.java
package com.sep490.backendclubmanagement.repository;

import com.sep490.backendclubmanagement.dto.response.FeaturedClubDTO;
import com.sep490.backendclubmanagement.entity.Club;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ClubRepository extends JpaRepository<Club, Long> {
    @Query("SELECT new com.sep490.backendclubmanagement.dto.response.FeaturedClubDTO(c.id, c.clubName, c.logoUrl, c.description) FROM Club c WHERE c.isFeatured = true")
    List<FeaturedClubDTO> findFeaturedClubs();
}