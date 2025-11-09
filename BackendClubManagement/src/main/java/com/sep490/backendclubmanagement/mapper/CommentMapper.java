package com.sep490.backendclubmanagement.mapper;

import com.sep490.backendclubmanagement.dto.response.CommentDTO;
import com.sep490.backendclubmanagement.entity.Comment;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CommentMapper {

    /** Map 1 Comment entity -> CommentDTO (KHÔNG kèm replies) */
    public CommentDTO toDTO(Comment c) {
        if (c == null) return null;
        return CommentDTO.builder()
                .id(c.getId())
                .postId(c.getPost().getId())
                .parentId(c.getParentComment() != null ? c.getParentComment().getId() : null)
                .rootParentId(c.getRootParentCommentId())
                .userId(c.getUser().getId())
                .userName(c.getUser().getFullName())
                .userAvatar(c.getUser().getAvatarUrl())
                .content(c.getContent())
                .edited(Boolean.TRUE.equals(c.getIsEdited()))
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    /** Map danh sách entity -> danh sách DTO (KHÔNG kèm replies) */
    public List<CommentDTO> toDTOs(List<Comment> entities) {
        return entities.stream().map(this::toDTO).toList();
    }
}
