package com.hcms.controller;

import com.hcms.entity.Complaint;
import com.hcms.service.ComplaintService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping
    public ResponseEntity<Complaint> createComplaint(@RequestParam Long userId, @RequestBody Complaint complaint) {
        Complaint saved = complaintService.createComplaint(userId, complaint);
        if (saved == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Complaint> editComplaint(@PathVariable("id") Long id,
            @RequestParam Long userId,
            @RequestBody Complaint complaint) {
        Optional<Complaint> updated = complaintService.editComplaint(id, userId, complaint);
        return updated.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.FORBIDDEN));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComplaint(@PathVariable("id") Long id,
            @RequestParam Long userId) {
        boolean deleted = complaintService.deleteComplaint(id, userId);
        if (deleted) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }
        return new ResponseEntity<>(HttpStatus.FORBIDDEN);
    }

    @GetMapping
    public ResponseEntity<List<Complaint>> getAllComplaints(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String hospitalLocation,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long userId) {
        List<Complaint> complaints = (category != null || severity != null || hospitalLocation != null || status != null || sort != null
                || search != null)
                        ? complaintService.getComplaintsFiltered(category, severity, hospitalLocation, status, sort, search,
                                userId)
                        : complaintService.getAllComplaints(userId);
        return new ResponseEntity<>(complaints, HttpStatus.OK);
    }

    @PutMapping("/{id}/admin")
    public ResponseEntity<Complaint> updateComplaintByAdmin(@PathVariable("id") Long id,
            @RequestParam Long adminUserId,
            @RequestBody java.util.Map<String, Object> body) {
        String severity = body.containsKey("severity") && body.get("severity") != null ? body.get("severity").toString()
                : null;
        Boolean pinned = body.containsKey("pinned") && body.get("pinned") != null ? (Boolean) body.get("pinned") : null;
        String status = body.containsKey("status") && body.get("status") != null ? body.get("status").toString() : null;
        String adminNote = body.containsKey("adminNote") && body.get("adminNote") != null
                ? body.get("adminNote").toString()
                : null;
        Optional<Complaint> updated = complaintService.updateByAdmin(id, adminUserId, severity, pinned, status,
                adminNote);
        return updated.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.FORBIDDEN));
    }

    @PostMapping("/{id}/upvote")
    public ResponseEntity<Complaint> upvoteComplaint(@PathVariable("id") Long id,
            @RequestParam Long userId) {
        Optional<Complaint> updated = complaintService.upvoteComplaint(id, userId);
        return updated.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.BAD_REQUEST));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Complaint> changeStatus(@PathVariable("id") Long id,
            @RequestParam String status,
            @RequestParam Long adminUserId) {
        Optional<Complaint> updated = complaintService.changeStatus(id, status, adminUserId);
        return updated.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.FORBIDDEN));
    }

    @PostMapping(value = "/{id}/image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadComplaintImage(@PathVariable("id") Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        String url = complaintService.uploadComplaintImage(id, file);
        if (url == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        return new ResponseEntity<>(url, HttpStatus.OK);
    }
}
