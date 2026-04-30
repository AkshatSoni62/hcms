package com.hcms.service;

import com.hcms.entity.Feedback;
import com.hcms.entity.User;
import com.hcms.repository.FeedbackRepository;
import com.hcms.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    public FeedbackService(FeedbackRepository feedbackRepository, UserRepository userRepository) {
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
    }

    public Feedback saveFeedback(Long userId, String subject, String message) {
        Optional<User> optionalUser = userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            return null;
        }

        Feedback feedback = new Feedback();
        feedback.setUser(optionalUser.get());
        feedback.setSubject(subject);
        feedback.setMessage(message);

        return feedbackRepository.save(feedback);
    }

    public List<Feedback> getAllFeedback() {
        return feedbackRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Feedback> getFeedbackByUser(Long userId) {
        return feedbackRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Feedback updateFeedback(Long feedbackId, String adminResponse, String status) {
        Optional<Feedback> optionalFeedback = feedbackRepository.findById(feedbackId);
        if (optionalFeedback.isEmpty()) {
            return null;
        }
        Feedback feedback = optionalFeedback.get();
        if (adminResponse != null) {
            feedback.setAdminResponse(adminResponse);
        }
        if (status != null) {
            feedback.setStatus(status);
        }
        return feedbackRepository.save(feedback);
    }
}
