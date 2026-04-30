package com.hcms.repository;

import com.hcms.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByComplaintId(Long complaintId);

    List<Comment> findByComplaintIdAndParentCommentIsNullOrderByCreatedAtDesc(Long complaintId);

    List<Comment> findByComplaintIdAndParentCommentIsNullOrderByUpvoteCountDesc(Long complaintId);

    List<Comment> findByParentCommentIdOrderByCreatedAtDesc(Long parentCommentId);

    void deleteByComplaintId(Long complaintId);

    long countByComplaintId(Long complaintId);
}

