package com.hcms.service;

import com.hcms.entity.User;
import com.hcms.repository.UserRepository;
import com.hcms.repository.DoctorRepository;
import com.hcms.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    public UserService(UserRepository userRepository, 
                       DoctorRepository doctorRepository, 
                       PatientRepository patientRepository) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
    }

    public User registerUser(User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return null; // Email already exists
        }
        return userRepository.save(user);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User login(String email, String password) {
        if (email == null || password == null) return null;
        return userRepository.findByEmail(email)
                .filter(u -> u.getPassword() != null && u.getPassword().equals(password))
                .orElse(null);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    /**
     * Update only profile fields (optional fields). Does not change email, password, or role.
     */
    public Optional<User> updateProfile(Long id, User profileData) {
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return Optional.empty();
        }
        User user = optionalUser.get();
        if (profileData.getFullName() != null) {
            user.setFullName(profileData.getFullName());
            
            // Sync name with Doctor/Patient entities if they exist
            final String name = profileData.getFullName();
            doctorRepository.findByUserId(id).ifPresent(d -> {
                d.setName(name);
                doctorRepository.save(d);
            });
            patientRepository.findByUserId(id).ifPresent(p -> {
                p.setName(name);
                patientRepository.save(p);
            });
        }
        
        if (profileData.getPhoneNumber() != null) user.setPhoneNumber(profileData.getPhoneNumber());
        if (profileData.getAddress() != null) user.setAddress(profileData.getAddress());
        if (profileData.getCity() != null) user.setCity(profileData.getCity());
        if (profileData.getState() != null) user.setState(profileData.getState());
        if (profileData.getDateOfBirth() != null) user.setDateOfBirth(profileData.getDateOfBirth());
        if (profileData.getGender() != null) user.setGender(profileData.getGender());
        if (profileData.getEmergencyContact() != null) user.setEmergencyContact(profileData.getEmergencyContact());
        if (profileData.getBloodGroup() != null) user.setBloodGroup(profileData.getBloodGroup());
        if (profileData.getMedicalHistory() != null) user.setMedicalHistory(profileData.getMedicalHistory());

        return Optional.of(userRepository.save(user));
    }

    /**
     * Save profile image file and update user's profileImageUrl. Returns the public URL path or null on failure.
     */
    public String uploadProfileImage(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        Optional<User> optionalUser = userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            return null;
        }
        String originalFilename = file.getOriginalFilename();
        String ext = ".jpg";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = "." + originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        }
        String filename = "profile_" + userId + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
        try {
            Path dir = Paths.get(uploadDir).resolve("profile").toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(filename);
            file.transferTo(target.toFile());
            String urlPath = "/uploads/profile/" + filename;
            
            User user = optionalUser.get();
            user.setProfileImageUrl(urlPath);
            userRepository.save(user);
            
            return urlPath;
        } catch (IOException e) {
            return null;
        }
    }

    public boolean updatePassword(String email, String newPassword) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPassword(newPassword);
            userRepository.save(user);
            return true;
        }
        return false;
    }
}

