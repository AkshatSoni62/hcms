package com.hcms.controller;

import com.hcms.entity.User;
import com.hcms.service.OtpService;
import com.hcms.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final OtpService otpService;
    private final UserService userService;

    public AuthController(OtpService otpService, UserService userService) {
        this.otpService = otpService;
        this.userService = userService;
    }

    // --- FORENSIC UTILITIES ---
    private String sanitizeEmail(String raw) {
        if (raw == null) return null;
        String sanitized = raw.replaceAll("[^\\x20-\\x7E]", "").toLowerCase().trim();
        StringBuilder hex = new StringBuilder();
        for (char c : sanitized.toCharArray()) {
            hex.append(String.format("%02x ", (int) c));
        }
        System.out.println("FORENSIC: Sanitized Email [" + sanitized + "] Length: " + sanitized.length() + " Hex: [" + hex.toString().trim() + "]");
        return sanitized;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<String> sendOtp(@RequestBody Map<String, String> payload) {
        System.out.println("FORENSIC: [POST /send-otp] payload: " + payload);
        String email = sanitizeEmail(payload.get("email"));
        String password = payload.get("password");
        boolean isSignup = Boolean.parseBoolean(payload.get("isSignup"));

        Optional<User> userOpt = userService.findByEmail(email);
        
        if (isSignup) {
            if (userOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Account already exists. Please sign in instead.");
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Password is required for signup");
            }
        } else {
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Account not found. Please sign up instead.");
            }
            if (password == null || !userOpt.get().getPassword().equals(password)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid password");
            }
        }

        String otp = otpService.generateOtp(email);
        otpService.sendOtpEmail(email, otp);
        return ResponseEntity.ok("OTP sent to " + email);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> payload) {
        System.out.println("FORENSIC: [POST /verify-otp] payload: " + payload);
        try {
            String email = sanitizeEmail(payload.get("email"));
            String otp = payload.get("otp") != null ? payload.get("otp").trim() : null;

            boolean isValid = otpService.verifyOtp(email, otp);
            if (!isValid) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or expired OTP");
            }

            Optional<User> userOpt = userService.findByEmail(email);
            if (userOpt.isPresent()) {
                return ResponseEntity.ok(userOpt.get());
            } else {
                return ResponseEntity.status(HttpStatus.OK).body(Map.of("status", "NEW_USER", "email", email));
            }
        } catch (Exception e) {
            System.err.println("FORENSIC: ERROR in verifyOtp: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Verification failed: " + e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody Map<String, String> payload) {
        System.out.println("FORENSIC: [POST /forgot-password] payload: " + payload);
        String email = sanitizeEmail(payload.get("email"));
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Account not found");
        }
        
        String otp = otpService.generateOtp(email);
        otpService.sendOtpEmail(email, otp);
        return ResponseEntity.ok("Reset OTP sent to " + email);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody Map<String, String> payload) {
        System.out.println("FORENSIC: [POST /reset-password] payload: " + payload);
        try {
            String email = sanitizeEmail(payload.get("email"));
            String otp = payload.get("otp") != null ? payload.get("otp").trim() : null;
            String newPassword = payload.get("newPassword");

            if (email == null || otp == null || newPassword == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing required fields");
            }

            boolean isValid = otpService.verifyOtp(email, otp);
            if (!isValid) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or expired OTP");
            }

            boolean updated = userService.updatePassword(email, newPassword);
            if (updated) {
                return ResponseEntity.ok("Password reset successfully");
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to reset password");
            }
        } catch (Exception e) {
            System.err.println("FORENSIC: ERROR in resetPassword: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Reset failed: " + e.getMessage());
        }
    }

    @PostMapping("/complete-signup")
    public ResponseEntity<?> completeSignup(@RequestBody Map<String, Object> payload) {
        String fullName = (String) payload.get("fullName");
        String email = sanitizeEmail((String) payload.get("email"));
        String password = (String) payload.get("password");
        String role = (String) payload.get("role");
        String adminKey = (String) payload.get("adminKey");

        if ("ADMIN".equalsIgnoreCase(role)) {
            if (!"HCMS-ADMIN-2026".equals(adminKey)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Admin Access Key");
            }
        }

        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPassword(password);
        user.setRole(role);

        User saved = userService.registerUser(user);
        if (saved == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("User already exists");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
