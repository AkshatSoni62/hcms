package com.hcms.service;

import com.hcms.entity.User;
import com.hcms.entity.UserSettings;
import com.hcms.repository.UserRepository;
import com.hcms.repository.UserSettingsRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserSettingsService {

    private final UserSettingsRepository settingsRepository;
    private final UserRepository userRepository;

    public UserSettingsService(UserSettingsRepository settingsRepository, UserRepository userRepository) {
        this.settingsRepository = settingsRepository;
        this.userRepository = userRepository;
    }

    public UserSettings getSettingsByUserId(Long userId) {
        return settingsRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSettings(userId));
    }

    private UserSettings createDefaultSettings(Long userId) {
        Optional<User> optionalUser = userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            return null;
        }
        UserSettings settings = new UserSettings(optionalUser.get());
        return settingsRepository.save(settings);
    }

    public UserSettings updateSettings(Long userId, UserSettings newSettings) {
        UserSettings existing = getSettingsByUserId(userId);
        if (existing == null) {
            return null;
        }

        if (newSettings.getThemeMode() != null) {
            existing.setThemeMode(newSettings.getThemeMode());
        }
        if (newSettings.getEmailNotifications() != null) {
            existing.setEmailNotifications(newSettings.getEmailNotifications());
        }
        if (newSettings.getPushNotifications() != null) {
            existing.setPushNotifications(newSettings.getPushNotifications());
        }
        if (newSettings.getPublicProfile() != null) {
            existing.setPublicProfile(newSettings.getPublicProfile());
        }

        existing.setLastUpdated(LocalDateTime.now());
        return settingsRepository.save(existing);
    }
}
