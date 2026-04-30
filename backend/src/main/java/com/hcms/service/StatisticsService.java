package com.hcms.service;

import com.hcms.repository.AppointmentRepository;
import com.hcms.repository.ComplaintRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatisticsService {

    private final ComplaintService complaintService;
    private final AppointmentService appointmentService;
    private final ComplaintRepository complaintRepository;

    public StatisticsService(ComplaintService complaintService,
                             AppointmentService appointmentService,
                             ComplaintRepository complaintRepository) {
        this.complaintService = complaintService;
        this.appointmentService = appointmentService;
        this.complaintRepository = complaintRepository;
    }

    public Map<String, Object> getComplaintStatistics() {
        Map<String, Object> result = new HashMap<>();

        long totalComplaints = complaintService.getTotalComplaints();
        long pendingCount = complaintService.countByStatus("PENDING");
        long inProgressCount = complaintService.countByStatus("IN_PROGRESS");
        long resolvedCount = complaintService.countByStatus("RESOLVED");
        long totalAppointments = appointmentService.getTotalAppointments();

        result.put("totalComplaints", totalComplaints);
        result.put("pendingComplaints", pendingCount);
        result.put("inProgressComplaints", inProgressCount);
        result.put("resolvedComplaints", resolvedCount);
        result.put("totalAppointments", totalAppointments);

        return result;
    }

    /** Analytics for admin: complaints per category, per hospital, resolution rate. */
    public Map<String, Object> getAnalytics() {
        Map<String, Object> result = new HashMap<>();
        long total = complaintService.getTotalComplaints();
        long resolved = complaintService.countByStatus("RESOLVED");
        result.put("resolutionRate", total > 0 ? (double) resolved / total : 0.0);
        Map<String, Long> byCategory = new HashMap<>();
        List<String> categories = complaintRepository.findDistinctCategories();
        for (String cat : categories) {
            byCategory.put(cat, complaintRepository.countByCategory(cat));
        }
        result.put("complaintsByCategory", byCategory);
        Map<String, Long> byHospital = new HashMap<>();
        List<String> locations = complaintRepository.findDistinctHospitalLocations();
        for (String loc : locations) {
            byHospital.put(loc, complaintRepository.countByHospitalLocation(loc));
        }
        result.put("complaintsByHospital", byHospital);
        return result;
    }
}

