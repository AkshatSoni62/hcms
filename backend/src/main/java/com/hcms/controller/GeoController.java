package com.hcms.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Server-side geocoding wrapper to avoid exposing API keys in the browser.
 *
 * Endpoints:
 * - /api/geo/geocode?address=...
 * - /api/geo/reverse?lat=...&lng=...
 */
@RestController
@RequestMapping("/api/geo")
public class GeoController {

    private final String apiKey;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GeoController(@Value("${google.maps.api-key:}") String apiKey, ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build();
    }

    @GetMapping("/geocode")
    public ResponseEntity<?> geocode(@RequestParam String address) {
        if (apiKey == null || apiKey.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Google Maps API key is not configured on server."));
        }
        if (address == null || address.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Address is required."));
        }

        try {
            String encoded = URLEncoder.encode(address.trim(), StandardCharsets.UTF_8);
            String url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + encoded + "&key=" + apiKey;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(12))
                    .GET()
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(res.body());
            String status = root.path("status").asText();

            if (!"OK".equals(status)) {
                // Common: ZERO_RESULTS, REQUEST_DENIED, OVER_DAILY_LIMIT, INVALID_REQUEST
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invalid address, please enter a valid location", "status", status));
            }

            JsonNode first = root.path("results").isArray() && root.path("results").size() > 0
                    ? root.path("results").get(0)
                    : null;
            if (first == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invalid address, please enter a valid location", "status", status));
            }

            String formatted = first.path("formatted_address").asText("");
            double lat = first.path("geometry").path("location").path("lat").asDouble();
            double lng = first.path("geometry").path("location").path("lng").asDouble();

            Map<String, Object> out = new HashMap<>();
            out.put("formattedAddress", formatted);
            out.put("latitude", lat);
            out.put("longitude", lng);
            return ResponseEntity.ok(out);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Geocoding failed. Please try again.", "details", e.getMessage()));
        }
    }

    @GetMapping("/reverse")
    public ResponseEntity<?> reverse(@RequestParam double lat, @RequestParam double lng) {
        if (apiKey == null || apiKey.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Google Maps API key is not configured on server."));
        }

        try {
            String url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng + "&key=" + apiKey;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(12))
                    .GET()
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(res.body());
            String status = root.path("status").asText();

            if (!"OK".equals(status)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Reverse geocoding failed.", "status", status));
            }

            JsonNode first = root.path("results").isArray() && root.path("results").size() > 0
                    ? root.path("results").get(0)
                    : null;
            if (first == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Reverse geocoding failed.", "status", status));
            }

            String formatted = first.path("formatted_address").asText("");
            return ResponseEntity.ok(Map.of("formattedAddress", formatted));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Reverse geocoding failed. Please try again.", "details", e.getMessage()));
        }
    }
}

