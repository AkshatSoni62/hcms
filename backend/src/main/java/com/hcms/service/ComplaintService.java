package com.hcms.service;

import com.hcms.entity.Complaint;
import com.hcms.entity.User;
import com.hcms.repository.ComplaintRepository;
import com.hcms.repository.CommentRepository;
import com.hcms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final NotificationService notificationService;

    public ComplaintService(ComplaintRepository complaintRepository,
            UserRepository userRepository,
            CommentRepository commentRepository,
            NotificationService notificationService) {
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public Complaint createComplaint(Long userId, Complaint complaint) {
        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            return null;
        }
        complaint.setUser(userOptional.get());
        complaint.setCreatedAt(LocalDateTime.now());
        if (complaint.getStatus() == null) {
            complaint.setStatus("PENDING");
        }
        if (complaint.getCategory() == null || complaint.getCategory().isBlank()) {
            complaint.setCategory(Complaint.CATEGORY_OTHER);
        }
        if (complaint.getSeverity() == null || complaint.getSeverity().isBlank()) {
            complaint.setSeverity(Complaint.SEVERITY_MEDIUM);
        }
        complaint.setUpvoteCount(0);
        complaint.setPriority(computePriority(complaint.getSeverity(), 0, 0));
        complaint.setPinned(complaint.getPinned() != null ? complaint.getPinned() : false);
        Complaint saved = complaintRepository.save(complaint);

        // Notify ALL ADMIN users when a complaint is created
        List<User> admins = userRepository.findByRole("ADMIN");
        for (User admin : admins) {
            notificationService.createNotification(
                    admin.getId(),
                    "New complaint submitted: \"" + saved.getTitle() + "\" by " + saved.getUser().getFullName() + ".",
                    "NEW_COMPLAINT",
                    saved.getId());
        }

        return saved;
    }

    public Optional<Complaint> editComplaint(Long complaintId, Long userId, Complaint updatedComplaint) {
        Optional<Complaint> optionalComplaint = complaintRepository.findById(complaintId);
        if (optionalComplaint.isEmpty()) {
            return Optional.empty();
        }
        Complaint existing = optionalComplaint.get();
        if (!existing.getUser().getId().equals(userId)) {
            return Optional.empty();
        }
        // Restrict edit if status is not PENDING
        if (!"PENDING".equalsIgnoreCase(existing.getStatus())) {
            return Optional.empty();
        }
        existing.setTitle(updatedComplaint.getTitle());
        existing.setDescription(updatedComplaint.getDescription());
        // Allow updating location while complaint is still pending
        existing.setHospitalLocation(updatedComplaint.getHospitalLocation());
        existing.setLocationAddress(updatedComplaint.getLocationAddress());
        existing.setLatitude(updatedComplaint.getLatitude());
        existing.setLongitude(updatedComplaint.getLongitude());
        return Optional.of(complaintRepository.save(existing));
    }

    @Transactional
    public boolean deleteComplaint(Long complaintId, Long userId) {
        Optional<Complaint> optionalComplaint = complaintRepository.findById(complaintId);
        if (optionalComplaint.isEmpty()) {
            return false;
        }
        Complaint complaint = optionalComplaint.get();
        Optional<User> requesterOpt = userRepository.findById(userId);

        boolean isAdmin = requesterOpt.isPresent() && "ADMIN".equalsIgnoreCase(requesterOpt.get().getRole());
        boolean isOwner = complaint.getUser().getId().equals(userId);

        if (!isAdmin && !isOwner) {
            return false;
        }
        // Clear many-to-many relationships
        complaint.getUpvotedUsers().clear();
        complaintRepository.save(complaint);

        // Delete comments first to avoid FK constraint violation
        commentRepository.deleteByComplaintId(complaintId);
        complaintRepository.delete(complaint);
        return true;
    }

    public List<Complaint> getAllComplaints(Long userId) {
        List<Complaint> list = complaintRepository.findAllByOrderByCreatedAtDesc();
        for (Complaint c : list) {
            c.setCommentCount(commentRepository.countByComplaintId(c.getId()));
            if (userId != null) {
                c.setUpvoted(c.getUpvotedUsers().stream().anyMatch(u -> u.getId().equals(userId)));
            }
        }
        return list;
    }

    @Transactional
    public Optional<Complaint> upvoteComplaint(Long complaintId, Long userId) {
        Optional<Complaint> optionalComplaint = complaintRepository.findById(complaintId);
        Optional<User> optionalUser = userRepository.findById(userId);
        if (optionalComplaint.isEmpty() || optionalUser.isEmpty()) {
            return Optional.empty();
        }
        Complaint complaint = optionalComplaint.get();
        User user = optionalUser.get();

        boolean alreadyUpvoted = complaint.getUpvotedUsers().contains(user);

        if (alreadyUpvoted) {
            complaint.getUpvotedUsers().remove(user);
        } else {
            complaint.getUpvotedUsers().add(user);
        }

        complaint.setUpvoteCount(complaint.getUpvotedUsers().size());

        long commentCount = commentRepository.countByComplaintId(complaint.getId());
        complaint.setPriority(
                computePriority(complaint.getSeverity(), complaint.getUpvotedUsers().size(), (int) commentCount));

        Complaint saved = complaintRepository.save(complaint);
        saved.setUpvoted(saved.getUpvotedUsers().stream().anyMatch(u -> u.getId().equals(userId)));
        return Optional.of(saved);
    }

    @Transactional
    public Optional<Complaint> changeStatus(Long complaintId, String newStatus, Long adminUserId) {
        Optional<User> optionalAdmin = userRepository.findById(adminUserId);
        if (optionalAdmin.isEmpty()) {
            return Optional.empty();
        }
        User admin = optionalAdmin.get();
        if (admin.getRole() == null || !admin.getRole().equalsIgnoreCase("ADMIN")) {
            return Optional.empty();
        }

        Optional<Complaint> optionalComplaint = complaintRepository.findById(complaintId);
        if (optionalComplaint.isEmpty()) {
            return Optional.empty();
        }
        Complaint complaint = optionalComplaint.get();
        complaint.setStatus(newStatus);
        Complaint saved = complaintRepository.save(complaint);

        notificationService.createNotification(
                complaint.getUser().getId(),
                "Status of your complaint \"" + complaint.getTitle() + "\" changed to " + newStatus + ".",
                "STATUS_UPDATE",
                complaint.getId());

        return Optional.of(saved);
    }

    public long getTotalComplaints() {
        return complaintRepository.count();
    }

    public long countByStatus(String status) {
        return complaintRepository.countByStatus(status);
    }

    /**
     * Priority: base from severity, then boost from upvotes. High severity + many
     * upvotes = boost.
     */
    private int computePriority(String severity, int upvotes, int comments) {
        int base = 0;
        if (severity != null) {
            switch (severity.toUpperCase()) {
                case "CRITICAL":
                    base = 40;
                    break;
                case "HIGH":
                    base = 30;
                    break;
                case "MEDIUM":
                    base = 20;
                    break;
                case "LOW":
                    base = 10;
                    break;
                default:
                    base = 20;
            }
        }
        return base + (upvotes * 2) + comments;
    }

    public List<Complaint> getComplaintsFiltered(String category, String severity, String hospitalLocation, String status,
            String sort, String searchKeyword, Long userId) {
        List<Complaint> list;
        if (searchKeyword != null && !searchKeyword.isBlank()) {
            list = complaintRepository.searchComplaints(searchKeyword.trim());
            if (category != null && !category.isBlank() || severity != null && !severity.isBlank()
                    || hospitalLocation != null && !hospitalLocation.isBlank() || status != null && !status.isBlank()) {
                list = list.stream()
                        .filter(c -> (category == null || category.isBlank() || category.equals(c.getCategory())) &&
                                (severity == null || severity.isBlank() || severity.equals(c.getSeverity())) &&
                                (hospitalLocation == null || hospitalLocation.isBlank()
                                        || hospitalLocation.equals(c.getHospitalLocation())) &&
                                (status == null || status.isBlank() || status.equalsIgnoreCase(c.getStatus())))
                        .toList();
            }
        } else if (category != null && !category.isBlank() || severity != null && !severity.isBlank()
                || hospitalLocation != null && !hospitalLocation.isBlank() || status != null && !status.isBlank()) {
            list = complaintRepository.findFiltered(
                    category != null && !category.isBlank() ? category : null,
                    severity != null && !severity.isBlank() ? severity : null,
                    hospitalLocation != null && !hospitalLocation.isBlank() ? hospitalLocation : null,
                    status != null && !status.isBlank() ? status : null);
        } else {
            list = complaintRepository.findAllByOrderByCreatedAtDesc();
        }
        list = new java.util.ArrayList<>(list);
        for (Complaint c : list) {
            c.setCommentCount(commentRepository.countByComplaintId(c.getId()));
            if (userId != null) {
                c.setUpvoted(c.getUpvotedUsers().stream().anyMatch(u -> u.getId().equals(userId)));
            }
        }
        if ("trending".equalsIgnoreCase(sort)) {
            list.sort((a, b) -> Double.compare(trendingScore(b), trendingScore(a)));
        } else if ("upvoted".equalsIgnoreCase(sort)) {
            list.sort((a, b) -> Integer.compare(b.getUpvoteCount(), a.getUpvoteCount()));
        } else {
            list.sort((a, b) -> (b.getCreatedAt() != null && a.getCreatedAt() != null)
                    ? b.getCreatedAt().compareTo(a.getCreatedAt())
                    : 0);
        }
        return list;
    }

    /** Admin: update severity, pinned, status, adminNote. */
    @Transactional
    public Optional<Complaint> updateByAdmin(Long complaintId, Long adminUserId, String severity, Boolean pinned,
            String status, String adminNote) {
        Optional<User> optionalAdmin = userRepository.findById(adminUserId);
        if (optionalAdmin.isEmpty())
            return Optional.empty();
        if (!"ADMIN".equalsIgnoreCase(optionalAdmin.get().getRole()))
            return Optional.empty();
        Optional<Complaint> opt = complaintRepository.findById(complaintId);
        if (opt.isEmpty())
            return Optional.empty();
        Complaint c = opt.get();
        if (severity != null)
            c.setSeverity(severity);
        if (pinned != null)
            c.setPinned(pinned);
        if (status != null)
            c.setStatus(status);
        if (adminNote != null)
            c.setAdminNote(adminNote);
        long commentCount = commentRepository.countByComplaintId(c.getId());
        c.setPriority(computePriority(c.getSeverity(), c.getUpvoteCount(), (int) commentCount));
        Complaint saved = complaintRepository.save(c);

        if (status != null) {
            notificationService.createNotification(
                    c.getUser().getId(),
                    "Status of your complaint \"" + c.getTitle() + "\" updated to " + status + ".",
                    "STATUS_UPDATE",
                    c.getId());
        }

        return Optional.of(saved);
    }

    /** Trending: (upvotes * 2) + comments - age factor (hours since created). */
    private double trendingScore(Complaint c) {
        long comments = c.getCommentCount() != null ? c.getCommentCount() : 0;
        int upvotes = c.getUpvoteCount();
        double ageHours = c.getCreatedAt() != null
                ? java.time.temporal.ChronoUnit.HOURS.between(c.getCreatedAt(), LocalDateTime.now())
                : 0;
        return (upvotes * 2.0) + comments - (ageHours * 0.1);
    }

    /**
     * Save complaint image file and update complaint's imageUrl. Returns the public
     * URL path or null on failure.
     */
    public String uploadComplaintImage(Long complaintId, org.springframework.web.multipart.MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        Optional<Complaint> optionalComplaint = complaintRepository.findById(complaintId);
        if (optionalComplaint.isEmpty()) {
            return null;
        }

        String uploadDir = "uploads/complaints";
        String originalFilename = file.getOriginalFilename();
        String ext = ".jpg";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = "." + originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        }
        String filename = "complaint_" + complaintId + "_" + java.util.UUID.randomUUID().toString().substring(0, 8)
                + ext;

        try {
            java.nio.file.Path dir = java.nio.file.Paths.get(uploadDir).toAbsolutePath().normalize();
            java.nio.file.Files.createDirectories(dir);
            java.nio.file.Path target = dir.resolve(filename);
            file.transferTo(target.toFile());

            String urlPath = "/uploads/complaints/" + filename;
            Complaint complaint = optionalComplaint.get();
            complaint.setImageUrl(urlPath);
            complaintRepository.save(complaint);
            return urlPath;
        } catch (java.io.IOException e) {
            return null;
        }
    }
}
