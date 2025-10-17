package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.Post;
import com.sep490.backendclubmanagement.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;

    // Bài toàn CLB
    public Page<PostWithRelationsData> getClubWidePosts(Long clubId, Pageable pageable) {
        Page<Post> page = postRepository.findClubWidePosts(clubId, true, "PUBLISHED", pageable);
        return page.map(this::toDetailsDTO);
    }

    // Bài theo team của CLB
    public Page<PostWithRelationsData> getTeamPosts(Long clubId, Long teamId, Pageable pageable) {
        Page<Post> page = postRepository.findTeamPosts(clubId, teamId, "PUBLISHED", pageable);
        return page.map(this::toDetailsDTO);
    }

    private PostWithRelationsData toDetailsDTO(Post p) {
        // sort media theo displayOrder (null -> cuối)
        List<PostMediaData> medias = p.getPostMedia() == null ? List.of()
                : p.getPostMedia().stream()
                .sorted(Comparator.comparing(pm -> pm.getDisplayOrder() == null ? Integer.MAX_VALUE : pm.getDisplayOrder()))
                .map(pm -> PostMediaData.builder()
                        .id(pm.getId())
                        .title(pm.getTitle())
                        .mediaUrl(pm.getMediaUrl())
                        .mediaType(pm.getMediaType())
                        .caption(pm.getCaption())
                        .displayOrder(pm.getDisplayOrder())
                        .createdAt(pm.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        List<CommentData> comments = p.getComments() == null ? List.of()
                : p.getComments().stream()
                .map(c -> CommentData.builder()
                        .id(c.getId())
                        .content(c.getContent())
                        .isEdited(Boolean.TRUE.equals(c.getIsEdited()))
                        .parentCommentId(c.getParentComment() != null ? c.getParentComment().getId() : null)
                        .userId(c.getUser() != null ? c.getUser().getId() : null)
                        .userName(c.getUser() != null ? c.getUser().getFullName() : null)
                        .createdAt(c.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        List<LikeData> likes = p.getLikes() == null ? List.of()
                : p.getLikes().stream()
                .map(l -> LikeData.builder()
                        .id(l.getId())
                        .userId(l.getUser() != null ? l.getUser().getId() : null)
                        .userName(l.getUser() != null ? l.getUser().getFullName() : null)
                        .createdAt(l.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return PostWithRelationsData.builder()
                .id(p.getId())
                .title(p.getTitle())
                .content(p.getContent())
                .status(p.getStatus())// nếu bạn muốn hiển thị cờ phụ
                .clubWide(p.isIsClubWide())
                .createdAt(p.getCreatedAt())
                .teamId(p.getTeam() != null ? p.getTeam().getId() : null)
                .teamName(p.getTeam() != null ? p.getTeam().getTeamName() : null)
                .clubId(p.getClub() != null ? p.getClub().getId() : null)
                .clubName(p.getClub() != null ? p.getClub().getClubName() : null)
                .authorId(p.getCreatedBy() != null ? p.getCreatedBy().getId() : null)
                .authorName(p.getCreatedBy() != null ? p.getCreatedBy().getFullName() : null)
                .media(medias)
                .comments(comments)
                .likes(likes)
                .build();
    }
}