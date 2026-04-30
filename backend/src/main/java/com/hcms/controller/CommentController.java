package com.hcms.controller;

import com.hcms.entity.Comment;
import com.hcms.service.CommentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    public static class ErrorResponse {
        private final String error;

        public ErrorResponse(String error) {
            this.error = error;
        }

        public String getError() {
            return error;
        }
    }

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping
    public ResponseEntity<?> addComment(@RequestParam Long userId,
                                        @RequestParam Long complaintId,
                                        @RequestParam(required = false) Long parentCommentId,
                                        @RequestBody Comment comment) {
        Optional<Comment> saved = commentService.addComment(userId, complaintId, parentCommentId, comment);
        if (saved.isPresent()) {
            return new ResponseEntity<>(saved.get(), HttpStatus.CREATED);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new CommentController.ErrorResponse("User or complaint not found, or invalid parent for reply."));
    }

    @PostMapping("/{id}/upvote")
    public ResponseEntity<Comment> upvoteComment(@PathVariable Long id, @RequestParam Long userId) {
        Optional<Comment> updated = commentService.upvoteComment(id, userId);
        return updated.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.BAD_REQUEST));
    }

    @GetMapping("/complaint/{complaintId}")
    public ResponseEntity<List<Comment>> getCommentsByComplaint(@PathVariable Long complaintId,
                                                                 @RequestParam(required = false) String sort,
                                                                 @RequestParam(required = false) Long userId) {
        List<Comment> comments = commentService.getCommentsByComplaint(complaintId, sort != null ? sort : "new", userId);
        return new ResponseEntity<>(comments, HttpStatus.OK);
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}")
    public ResponseEntity<?> editComment(@PathVariable Long id,
                                         @RequestParam Long userId,
                                         @RequestBody java.util.Map<String, String> body) {
        String content = body.get("content");
        Optional<Comment> updated = commentService.editComment(id, userId, content);
        if (updated.isPresent()) {
            return new ResponseEntity<>(updated.get(), HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.FORBIDDEN);
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id,
                                              @RequestParam Long userId) {
        boolean deleted = commentService.deleteComment(id, userId);
        if (deleted) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }
        return new ResponseEntity<>(HttpStatus.FORBIDDEN);
    }

}