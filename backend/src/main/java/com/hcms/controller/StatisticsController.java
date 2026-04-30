package com.hcms.controller;

import com.hcms.service.StatisticsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("/complaints")
    public ResponseEntity<Map<String, Object>> getComplaintStatistics() {
        Map<String, Object> stats = statisticsService.getComplaintStatistics();
        return new ResponseEntity<>(stats, HttpStatus.OK);
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        Map<String, Object> analytics = statisticsService.getAnalytics();
        return new ResponseEntity<>(analytics, HttpStatus.OK);
    }
}

