package com.hcms.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class EmailService {

    private static final String SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwuOyLnYcSwLEVqcypk8AfBA_EoD-KIkTJYuKlg7WcWFoDWPN65xD3z3LAGRBb5NK2Zvw/exec";
    private final HttpClient httpClient;

    public EmailService() {
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    @Async
    public void sendSimpleEmail(String to, String subject, String text) {
        try {
            // Manually build JSON to avoid adding new Jackson/Gson dependencies in this class
            String jsonPayload = String.format("{\"to\":\"%s\", \"subject\":\"%s\", \"text\":\"%s\"}", 
                    escapeJson(to), escapeJson(subject), escapeJson(text));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SCRIPT_URL))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            System.out.println("FORENSIC: Email sent successfully via App Script to [" + to + "]. Status: " + response.statusCode());
        } catch (Exception e) {
            System.err.println("FORENSIC ERROR: Failed to send email to [" + to + "]: " + e.getMessage());
        }
    }
    
    @Async
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        sendSimpleEmail(to, subject, htmlContent);
    }

    private String escapeJson(String input) {
        if (input == null) return "";
        return input.replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
