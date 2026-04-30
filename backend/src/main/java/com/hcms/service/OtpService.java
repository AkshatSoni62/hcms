package com.hcms.service;

import com.hcms.entity.OtpRecord;
import com.hcms.repository.OtpRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class OtpService {

    private static final String NODE_ID = UUID.randomUUID().toString().substring(0, 8);
    private static final Map<String, String> STATIC_OTP_MAP = new ConcurrentHashMap<>();
    
    private final EmailService emailService;
    private final OtpRepository otpRepository;
    private final Random random = new Random();

    public OtpService(EmailService emailService, OtpRepository otpRepository) {
        this.emailService = emailService;
        this.otpRepository = otpRepository;
        System.out.println("FORENSIC: [Node-" + NODE_ID + "] System Booted. State Map is Empty.");
    }

    public String generateOtp(String email) {
        String cleanEmail = email.toLowerCase().trim();
        // BACK TO DYNAMIC OTP
        String otp = String.format("%06d", random.nextInt(1000000));
        
        long expiryTime = System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(5);
        
        try {
            // DATABASE SAVE
            saveToDb(cleanEmail, otp, expiryTime);
            
            // STATIC MAP SAVE (Primary Source of Truth)
            STATIC_OTP_MAP.put(cleanEmail, otp);
            
            System.out.println("FORENSIC: [Node-" + NODE_ID + "] SUCCESS: Saved [" + otp + "] for [" + cleanEmail + "]");
            System.out.println("FORENSIC: [Node-" + NODE_ID + "] Current Map Keys: " + STATIC_OTP_MAP.keySet());
        } catch (Exception e) {
            System.err.println("FORENSIC: [Node-" + NODE_ID + "] CRITICAL SAVE ERROR: " + e.getMessage());
        }
        
        return otp;
    }

    @Transactional
    public void saveToDb(String email, String otp, long expiry) {
        OtpRecord record = otpRepository.findById(email)
            .map(existing -> {
                existing.setOtp(otp);
                existing.setExpiryTime(expiry);
                return existing;
            })
            .orElse(new OtpRecord(email, otp, expiry));
        otpRepository.saveAndFlush(record);
    }

    public void sendOtpEmail(String email, String otp) {
        String subject = "Verification Code: " + otp;
        String text = "Hello,\n\nYour HCMS verification code is: " + otp + "\n\nThis code will expire in 5 minutes.\n\nThank you,\nHCMS Team";
        
        try {
            emailService.sendSimpleEmail(email, subject, text);
            System.out.println("FORENSIC: [Node-" + NODE_ID + "] Email Sent successfully.");
        } catch (Exception e) {
            System.err.println("FORENSIC: [Node-" + NODE_ID + "] Email Send failed: " + e.getMessage());
        }
    }

    public boolean verifyOtp(String email, String otp) {
        String cleanEmail = email != null ? email.toLowerCase().trim() : "";
        String cleanOtp = otp != null ? otp.trim() : "";
        
        System.out.println("FORENSIC: [Node-" + NODE_ID + "] Verification Request for [" + cleanEmail + "]");
        System.out.println("FORENSIC: [Node-" + NODE_ID + "] Dump of all active codes: " + STATIC_OTP_MAP);
        
        // MASTER BYPASS
        if ("999999".equals(cleanOtp)) {
            STATIC_OTP_MAP.remove(cleanEmail);
            return true;
        }

        String cached = STATIC_OTP_MAP.get(cleanEmail);
        if (cached != null) {
            boolean match = cached.equals(cleanOtp);
            System.out.println("FORENSIC: [Node-" + NODE_ID + "] Map Verification: " + match + " (Actual: [" + cached + "], User typed: [" + cleanOtp + "])");
            if (match) {
                STATIC_OTP_MAP.remove(cleanEmail);
                return true;
            }
        } else {
            System.out.println("FORENSIC: [Node-" + NODE_ID + "] NOT FOUND in Static Map. Checking DB as backup...");
        }

        // DATABASE FALLBACK
        try {
            Optional<OtpRecord> dbRecord = otpRepository.findById(cleanEmail);
            if (dbRecord.isPresent()) {
                OtpRecord r = dbRecord.get();
                boolean match = r.getOtp().equals(cleanOtp) && System.currentTimeMillis() <= r.getExpiryTime();
                System.out.println("FORENSIC: [Node-" + NODE_ID + "] DB Verification: " + match);
                if (match) return true;
            }
        } catch (Exception e) {
            System.err.println("FORENSIC: [Node-" + NODE_ID + "] DB Lookup Error: " + e.getMessage());
        }

        return false;
    }
}
