package com.hcms.config;

import com.hcms.entity.*;
import com.hcms.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Configuration
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final DiseaseRepository diseaseRepository;
    private final ComplaintRepository complaintRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final NotificationRepository notificationRepository;

    private final Random random = new Random();

    public DataSeeder(UserRepository userRepository, HospitalRepository hospitalRepository,
            DiseaseRepository diseaseRepository, ComplaintRepository complaintRepository,
            AppointmentRepository appointmentRepository, DoctorRepository doctorRepository,
            PatientRepository patientRepository, NotificationRepository notificationRepository) {
        this.userRepository = userRepository;
        this.hospitalRepository = hospitalRepository;
        this.diseaseRepository = diseaseRepository;
        this.complaintRepository = complaintRepository;
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.notificationRepository = notificationRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // Force seeding even if some data exists, but we'll check for our specific demo
        // admin
        // Seed essential admins if they don't exist
        seedEssentialAdmins();

        if (userRepository.findByEmail("admin@hcms.local").isPresent()) {
            System.out.println("Main demo data already exists. Skipping bulk demo seed.");
            return;
        }

        System.out.println("Forcing database seed with demo data...");

        // 1. Create Users
        User admin = createUser("System Admin", "admin@hcms.local", "admin", "ADMIN");
        User doctorUser = createUser("Dr. Smith", "smith@hcms.local", "password", "DOCTOR");
        User staffUser = createUser("Hospital Staff", "staff@hcms.local", "password", "STAFF");
        User patientUser = createUser("John Doe", "patient@hcms.local", "password", "PATIENT");
        User patientUser2 = createUser("Jane Smith", "jane@hcms.local", "password", "PATIENT");

        // 2. Create Doctors & Patients linked to users
        Doctor doctor = new Doctor();
        doctor.setName("Dr. Smith");
        doctor.setSpecialization("Cardiology");
        doctor.setUser(doctorUser);
        doctorRepository.save(doctor);

        Patient patient1 = new Patient();
        patient1.setName("John Doe");
        patient1.setAge(30);
        patient1.setGender("Male");
        patient1.setUser(patientUser);
        patientRepository.save(patient1);

        Patient patient2 = new Patient();
        patient2.setName("Jane Smith");
        patient2.setAge(25);
        patient2.setGender("Female");
        patient2.setUser(patientUser2);
        patientRepository.save(patient2);

        // 3. Create Hospitals
        String[] hospitalNames = { "City General", "Sunrise Hospital", "Healing Hands", "Metro Clinic",
                "Universal Medical" };
        List<Hospital> hospitals = new ArrayList<>();
        for (String name : hospitalNames) {
            Hospital h = new Hospital();
            h.setName(name);
            h.setAddress(name + " Road, City Center");
            hospitals.add(hospitalRepository.save(h));
        }

        // 4. Create Diseases
        String[] diseaseNames = { "Covid-19", "Influenza", "Diabetes", "Hypertension", "Common Cold" };
        for (String name : diseaseNames) {
            Disease d = new Disease();
            d.setName(name);
            d.setDescription("Description for " + name);
            d.setSymptoms("Fever, Cough, Fatigue");
            d.setPreventionTips("Walk daily, eat healthy.");
            diseaseRepository.save(d);
        }

        // 5. Create 20 Complaints
        String[] statuses = { "PENDING", "IN_PROGRESS", "RESOLVED" };
        String[] categories = {
                Complaint.CATEGORY_ROOM_HYGIENE,
                Complaint.CATEGORY_BATHROOM_ISSUES,
                Complaint.CATEGORY_ELECTRICITY,
                Complaint.CATEGORY_WATER_SUPPLY,
                Complaint.CATEGORY_INTERNET,
                Complaint.CATEGORY_MESS_FOOD,
                Complaint.CATEGORY_FURNITURE_DAMAGE,
                Complaint.CATEGORY_NOISE,
                Complaint.CATEGORY_SECURITY,
                Complaint.CATEGORY_OTHER
        };
        String[] severities = { Complaint.SEVERITY_LOW, Complaint.SEVERITY_MEDIUM, Complaint.SEVERITY_HIGH,
                Complaint.SEVERITY_CRITICAL };

        for (int i = 1; i <= 20; i++) {
            Complaint c = new Complaint();
            c.setTitle("Complaint #" + i);
            c.setDescription("Detailed description for complaint number " + i + ". This is a demo record.");
            c.setStatus(statuses[random.nextInt(statuses.length)]);
            c.setCategory(categories[random.nextInt(categories.length)]);
            c.setSeverity(severities[random.nextInt(severities.length)]);
            c.setCreatedAt(LocalDateTime.now().minusDays(random.nextInt(30)));
            c.setUser(patientUser);
            c.setHospitalLocation(hospitals.get(random.nextInt(hospitals.size())).getName());
            c.setUpvoteCount(random.nextInt(50));
            complaintRepository.save(c);
        }

        // 6. Create 20 Appointments
        for (int i = 1; i <= 20; i++) {
            Appointment a = new Appointment();
            a.setPatient(random.nextBoolean() ? patient1 : patient2);
            a.setDoctor(doctor);
            a.setDate(LocalDate.now().plusDays(random.nextInt(14) - 7));
            a.setTime(LocalTime.of(9 + random.nextInt(8), 0));
            a.setStatus(i % 5 == 0 ? "CANCELLED" : (a.getDate().isBefore(LocalDate.now()) ? "COMPLETED" : "BOOKED"));
            a.setHospitalLocation(hospitals.get(random.nextInt(hospitals.size())).getName());
            a.setDepartment("General Medicine");
            a.setDiseaseName(diseaseNames[random.nextInt(diseaseNames.length)]);
            a.setPatientContactNumber("1234567890");
            a.setNotes("Demo appointment notes for #" + i);
            a.setAppointmentType(random.nextBoolean() ? "ONLINE" : "OFFLINE");
            appointmentRepository.save(a);
        }

        // 7. Create 20 Notifications
        for (int i = 1; i <= 20; i++) {
            Notification n = new Notification();
            n.setMessage("This is notification #" + i + " for the demo.");
            n.setRead(random.nextInt(10) > 3);
            n.setCreatedAt(LocalDateTime.now().minusHours(random.nextInt(100)));
            n.setUser(admin);
            notificationRepository.save(n);
        }

        System.out.println("Database seeded successfully with 20 records for critical entities.");
    }

    private void seedEssentialAdmins() {
        if (userRepository.findByEmail("admin1@hcms.local").isEmpty()) {
            createUser("Admin One", "admin1@hcms.local", "admin123", "ADMIN");
        }
        if (userRepository.findByEmail("admin2@hcms.local").isEmpty()) {
            createUser("Admin Two", "admin2@hcms.local", "admin456", "ADMIN");
        }
        if (userRepository.findByEmail("masteradmin@hcms.local").isEmpty()) {
            createUser("Master Admin", "masteradmin@hcms.local", "system789", "ADMIN");
        }
    }

    private User createUser(String name, String email, String password, String role) {
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setPassword(password);
        u.setRole(role);
        return userRepository.save(u);
    }
}
