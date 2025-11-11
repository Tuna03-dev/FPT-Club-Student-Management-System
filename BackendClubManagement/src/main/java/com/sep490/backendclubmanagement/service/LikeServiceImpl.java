package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.response.LikeDTO;
import com.sep490.backendclubmanagement.entity.Like;
import com.sep490.backendclubmanagement.entity.Post;
import com.sep490.backendclubmanagement.mapper.LikeMapper;
import com.sep490.backendclubmanagement.repository.LikeRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
public class LikeServiceImpl implements LikeService {

    private final LikeRepository likeRepo;
    private final EntityManager em;
    private final LikeMapper likeMapper;

    @Override
    @Transactional
    public boolean toggleLike(Long postId, Long userId) {
        // Nếu đã like -> bỏ like
        if (likeRepo.existsByPost_IdAndUser_Id(postId, userId)) {
            likeRepo.deleteByPost_IdAndUser_Id(postId, userId);
            return false;
        }
        // Nếu chưa like -> tạo like (dùng reference để không tốn query không cần)
        var postRef = em.getReference(Post.class, postId);
        var userRef = em.getReference(com.sep490.backendclubmanagement.entity.User.class, userId);
        try {
            likeRepo.save(Like.builder().post(postRef).user(userRef).build());
            return true;
        } catch (DataIntegrityViolationException e) {
            // Đề phòng click nhanh song song gây vi phạm unique (user_id, post_id)
            // => coi như đã like
            return true;
        }
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public long count(Long postId) {
        return likeRepo.countByPost_Id(postId);
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public boolean isLikedByUser(Long postId, Long userId) {
        return likeRepo.existsByPost_IdAndUser_Id(postId, userId);
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public Page<LikeDTO> listLikes(Long postId, Pageable pageable) {
        return likeRepo.findByPost_Id(postId, pageable)
                .map(likeMapper::toDTO);
    }
}
