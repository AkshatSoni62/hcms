package com.hcms.controller;

import com.hcms.entity.UserSettings;
import com.hcms.service.UserSettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class UserSettingsController {

    private final UserSettingsService settingsService;

    public UserSettingsController(UserSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/user")
    public ResponseEntity<UserSettings> getSettings(@RequestParam Long userId) {
        UserSettings settings = settingsService.getSettingsByUserId(userId);
        if (settings == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(settings, HttpStatus.OK);
    }

    @PutMapping("/update")
    public ResponseEntity<UserSettings> updateSettings(@RequestParam Long userId, @RequestBody UserSettings settings) {
        UserSettings updated = settingsService.updateSettings(userId, settings);
        if (updated == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }
}
