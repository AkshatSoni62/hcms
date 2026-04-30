package com.hcms.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.Column;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String description;

    /**
     * Possible values: PENDING, IN_PROGRESS, RESOLVED
     */
    private String status;

    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private int upvoteCount;

    @ManyToMany
    @JoinTable(
            name = "complaint_upvotes",
            joinColumns = @JoinColumn(name = "complaint_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> upvotedUsers = new HashSet<>();

    /**
     * Transient: set by service for API response (comment count).
     */
    @Transient
    private Long commentCount;

    /** Category: Medical, Staff, Facility, Billing, Emergency, Other */
    private String category;

    /** Severity: Low, Medium, High, Critical */
    private String severity;

    @Transient
    private boolean upvoted;

    /** Computed priority (higher = more urgent). Can be boosted by severity + upvotes. */
    private Integer priority;

    /** Hospital/location filter */
    private String hospitalLocation;

    /**
     * User-selected location (from map picker).
     * Stored separately from hospitalLocation so filtering can keep working independently.
     */
    @Column(columnDefinition = "TEXT")
    private String locationAddress;

    /** Selected latitude (WGS84) */
    private Double latitude;

    /** Selected longitude (WGS84) */
    private Double longitude;

    /** User-entered name for the hospital */
    private String hospitalName;

    /** Admin can pin important complaints */
    private Boolean pinned;

    /** Admin note when resolving */
    private String adminNote;

    /** Path to uploaded image */
    private String imageUrl;

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public static final String CATEGORY_ROOM_HYGIENE = "Room Hygiene";
    public static final String CATEGORY_BATHROOM_ISSUES = "Bathroom / Toilet Issues";
    public static final String CATEGORY_ELECTRICITY = "Electricity Problems";
    public static final String CATEGORY_WATER_SUPPLY = "Water Supply Issues";
    public static final String CATEGORY_INTERNET = "Internet / WiFi Problems";
    public static final String CATEGORY_MESS_FOOD = "Mess / Food Issues";
    public static final String CATEGORY_FURNITURE_DAMAGE = "Furniture / Room Damage";
    public static final String CATEGORY_NOISE = "Noise / Disturbance";
    public static final String CATEGORY_SECURITY = "Security Issues";
    public static final String CATEGORY_OTHER = "Other Complaints";
    public static final String SEVERITY_LOW = "Low";
    public static final String SEVERITY_MEDIUM = "Medium";
    public static final String SEVERITY_HIGH = "High";
    public static final String SEVERITY_CRITICAL = "Critical";

    public Complaint() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public int getUpvoteCount() {
        return upvoteCount;
    }

    public void setUpvoteCount(int upvoteCount) {
        this.upvoteCount = upvoteCount;
    }

    public Set<User> getUpvotedUsers() {
        return upvotedUsers;
    }

    public void setUpvotedUsers(Set<User> upvotedUsers) {
        this.upvotedUsers = upvotedUsers;
    }

    public Long getCommentCount() {
        return commentCount;
    }

    public void setCommentCount(Long commentCount) {
        this.commentCount = commentCount;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public boolean isUpvoted() {
        return upvoted;
    }

    public void setUpvoted(boolean upvoted) {
        this.upvoted = upvoted;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getHospitalLocation() {
        return hospitalLocation;
    }

    public void setHospitalLocation(String hospitalLocation) {
        this.hospitalLocation = hospitalLocation;
    }

    public String getLocationAddress() {
        return locationAddress;
    }

    public void setLocationAddress(String locationAddress) {
        this.locationAddress = locationAddress;
    }

    public String getHospitalName() {
        return hospitalName;
    }

    public void setHospitalName(String hospitalName) {
        this.hospitalName = hospitalName;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Boolean getPinned() {
        return pinned;
    }

    public void setPinned(Boolean pinned) {
        this.pinned = pinned;
    }

    public String getAdminNote() {
        return adminNote;
    }

    public void setAdminNote(String adminNote) {
        this.adminNote = adminNote;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Complaint complaint = (Complaint) o;
        return id != null && id.equals(complaint.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}

