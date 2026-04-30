package com.hcms.controller;

import com.hcms.entity.Feedback;
import com.hcms.service.FeedbackService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping
    public ResponseEntity<Feedback> submitFeedback(@RequestParam("userId") Long userId,
                                                   @RequestParam("subject") String subject,
                                                   @RequestParam("message") String message) {
        Feedback saved = feedbackService.saveFeedback(userId, subject, message);
        if (saved == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Feedback>> getAllFeedback() {
        List<Feedback> feedbackList = feedbackService.getAllFeedback();
        return new ResponseEntity<>(feedbackList, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Feedback>> getFeedbackByUser(@PathVariable("userId") Long userId) {
        List<Feedback> feedbackList = feedbackService.getFeedbackByUser(userId);
        return new ResponseEntity<>(feedbackList, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Feedback> updateFeedback(@PathVariable("id") Long id,
                                                   @RequestParam(value = "adminResponse", required = false) String adminResponse,
                                                   @RequestParam(value = "status", required = false) String status) {
        Feedback updated = feedbackService.updateFeedback(id, adminResponse, status);
        if (updated == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }
}
