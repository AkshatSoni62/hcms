package com.hcms.service;

import com.hcms.entity.Comment;
import com.hcms.entity.Complaint;
import com.hcms.entity.User;
import com.hcms.repository.CommentRepository;
import com.hcms.repository.ComplaintRepository;
import com.hcms.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public CommentService(CommentRepository commentRepository,
                          ComplaintRepository complaintRepository,
                          UserRepository userRepository,
                          NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public Optional<Comment> addComment(Long userId, Long complaintId, Comment comment) {
        return addComment(userId, complaintId, null, comment);
    }

    @org.springframework.transaction.annotation.Transactional
    public Optional<Comment> addComment(Long userId, Long complaintId, Long parentCommentId, Comment comment) {
        Optional<User> optionalUser = userRepository.findById(userId);
        Optional<Complaint> optionalComplaint = complaintRepository.findById(complaintId);
        if (optionalUser.isEmpty() || optionalComplaint.isEmpty()) {
            return Optional.empty();
        }
        User user = optionalUser.get();
        Complaint complaint = optionalComplaint.get();

        if (parentCommentId != null) {
            Optional<Comment> parentOpt = commentRepository.findById(parentCommentId);
            if (parentOpt.isEmpty() || !parentOpt.get().getComplaint().getId().equals(complaintId)) {
                return Optional.empty();
            }
            Comment parent = parentOpt.get();
            if (parent.getParentComment() != null) {
                return Optional.empty();
            }
            comment.setParentComment(parent);
        } else {
            comment.setParentComment(null);
        }

        comment.setUser(user);
        comment.setComplaint(complaint);
        comment.setCreatedAt(LocalDateTime.now());
        comment.setUpvoteCount(0);
        Comment saved = commentRepository.save(comment);

        notificationService.createNotification(
                complaint.getUser().getId(),
                "New comment on your complaint \"" + complaint.getTitle() + "\".",
                "NEW_COMMENT",
                complaint.getId()
        );

        return Optional.of(saved);
    }

    public Optional<Comment> upvoteComment(Long commentId, Long userId) {
        Optional<Comment> optComment = commentRepository.findById(commentId);
        Optional<User> optUser = userRepository.findById(userId);
        if (optComment.isEmpty() || optUser.isEmpty()) return Optional.empty();
        Comment comment = optComment.get();
        User user = optUser.get();

        if (comment.getUpvotedUsers().contains(user)) {
            comment.getUpvotedUsers().remove(user);
        } else {
            comment.getUpvotedUsers().add(user);
        }

        comment.setUpvoteCount(comment.getUpvotedUsers().size());
        Comment saved = commentRepository.save(comment);
        populateUpvoted(saved, userId);
        return Optional.of(saved);
    }

    public List<Comment> getCommentsByComplaint(Long complaintId, Long userId) {
        return getCommentsByComplaint(complaintId, "new", userId);
    }

    public List<Comment> getCommentsByComplaint(Long complaintId, String sort, Long userId) {
        List<Comment> topLevel = "top".equalsIgnoreCase(sort)
                ? commentRepository.findByComplaintIdAndParentCommentIsNullOrderByUpvoteCountDesc(complaintId)
                : commentRepository.findByComplaintIdAndParentCommentIsNullOrderByCreatedAtDesc(complaintId);
        for (Comment c : topLevel) {
            c.setReplies(commentRepository.findByParentCommentIdOrderByCreatedAtDesc(c.getId()));
            populateUpvoted(c, userId);
            for (Comment reply : c.getReplies()) {
                populateUpvoted(reply, userId);
            }
        }
        return topLevel;
    }

    private void populateUpvoted(Comment c, Long userId) {
        if (userId != null) {
            c.setUpvoted(c.getUpvotedUsers().stream().anyMatch(u -> u.getId().equals(userId)));
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public Optional<Comment> editComment(Long commentId, Long userId, String newContent) {
        Optional<Comment> opt = commentRepository.findById(commentId);
        if (opt.isEmpty()) return Optional.empty();
        Comment comment = opt.get();
        if (!comment.getUser().getId().equals(userId)) return Optional.empty();
        comment.setContent(newContent);
        return Optional.of(commentRepository.save(comment));
    }

    @org.springframework.transaction.annotation.Transactional
    public boolean deleteComment(Long commentId, Long requesterUserId) {
        Optional<Comment> opt = commentRepository.findById(commentId);
        if (opt.isEmpty()) return false;
        Comment comment = opt.get();
        Optional<User> requesterOpt = userRepository.findById(requesterUserId);
        
        boolean isAdmin = requesterOpt.isPresent() && "ADMIN".equalsIgnoreCase(requesterOpt.get().getRole());
        boolean isOwner = comment.getUser().getId().equals(requesterUserId);

        if (!isAdmin && !isOwner) return false;
        
        commentRepository.delete(comment);
        return true;
    }

}