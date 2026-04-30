package com.hcms.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendSimpleEmail(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("badshot62@gmail.com");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
            System.out.println("FORENSIC: Email sent successfully to [" + to + "] Subject: [" + subject + "]");
        } catch (Exception e) {
            System.err.println("FORENSIC ERROR: Failed to send email to [" + to + "]: " + e.getMessage());
        }
    }
    
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        // Placeholder for future rich email support
        sendSimpleEmail(to, subject, htmlContent);
    }
}
