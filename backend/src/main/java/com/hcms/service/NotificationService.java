package com.hcms.service;

import com.hcms.dto.NotificationDTO;
import com.hcms.entity.Notification;
import com.hcms.entity.User;
import com.hcms.entity.UserSettings;
import com.hcms.repository.NotificationRepository;
import com.hcms.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final UserSettingsService userSettingsService;

    public NotificationService(NotificationRepository notificationRepository, 
                               UserRepository userRepository,
                               EmailService emailService,
                               UserSettingsService userSettingsService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.userSettingsService = userSettingsService;
    }

    public Notification createNotification(Long userId, String message) {
        return createNotification(userId, message, null, null);
    }

    public Notification createNotification(Long userId, String message, String type) {
        return createNotification(userId, message, type, null);
    }

    public Notification createNotification(Long userId, String message, String type, Long referenceId) {
        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            return null;
        }
        Notification notification = new Notification();
        notification.setUser(userOptional.get());
        notification.setMessage(message);
        notification.setType(type);
        notification.setReferenceId(referenceId);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        Notification saved = notificationRepository.save(notification);

        // SEND EMAIL IF PREFERRED
        try {
            UserSettings settings = userSettingsService.getSettingsByUserId(userId);
            if (settings != null && Boolean.TRUE.equals(settings.getEmailNotifications())) {
                String subject = "New Notification from HCMS: " + (type != null ? type : "Update");
                emailService.sendSimpleEmail(userOptional.get().getEmail(), subject, message);
            }
        } catch (Exception e) {
            System.err.println("FORENSIC ERROR: Notification email dispatch failed: " + e.getMessage());
        }

        return saved;
    }

    public List<NotificationDTO> getNotificationsByUser(Long userId) {
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private NotificationDTO convertToDTO(Notification n) {
        return new NotificationDTO(
                n.getId(),
                n.getMessage(),
                n.isRead(),
                n.getCreatedAt(),
                n.getType(),
                n.getReferenceId()
        );
    }

    public Optional<NotificationDTO> markAsRead(Long notificationId) {
        Optional<Notification> optionalNotification = notificationRepository.findById(notificationId);
        if (optionalNotification.isPresent()) {
            Notification notification = optionalNotification.get();
            notification.setRead(true);
            notificationRepository.save(notification);
            return Optional.of(convertToDTO(notification));
        }
        return Optional.empty();
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUser_IdAndReadFalse(userId);
    }

    public void markAllAsRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        for (Notification n : notifications) {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void clearNotifications(Long userId) {
        notificationRepository.deleteByUser_Id(userId);
    }
}

