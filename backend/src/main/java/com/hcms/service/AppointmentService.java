package com.hcms.service;

import com.hcms.entity.Appointment;
import com.hcms.entity.Doctor;
import com.hcms.entity.Patient;
import com.hcms.repository.AppointmentRepository;
import com.hcms.repository.DoctorRepository;
import com.hcms.repository.PatientRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final NotificationService notificationService;
    private final com.hcms.repository.UserRepository userRepository;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              PatientRepository patientRepository,
                              DoctorRepository doctorRepository,
                              NotificationService notificationService,
                              com.hcms.repository.UserRepository userRepository) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    public Optional<Appointment> bookAppointment(Long patientId, Long doctorId, LocalDate date, LocalTime time) {
        return bookAppointment(patientId, doctorId, date, time, null, null, null, null, null, null);
    }

    @org.springframework.transaction.annotation.Transactional
    public Optional<Appointment> bookAppointment(Long patientUserId, Long doctorUserId, LocalDate date, LocalTime time,
                                                   String hospitalLocation, String department, String diseaseName,
                                                   String patientContactNumber, String notes, String appointmentType) {
        Optional<Patient> optionalPatient = patientRepository.findByUserId(patientUserId);
        Optional<Doctor> optionalDoctor = (doctorUserId != null) ? doctorRepository.findByUserId(doctorUserId) : Optional.empty();
        
        if (optionalPatient.isEmpty()) {
            return Optional.empty();
        }
        
        if (doctorUserId != null && optionalDoctor.isEmpty()) {
            return Optional.empty();
        }

        // No booking in past date
        if (date != null && date.isBefore(LocalDate.now())) {
            return Optional.empty();
        }

        if (doctorUserId != null) {
            Optional<Appointment> existing =
                    appointmentRepository.findByDoctorIdAndDateAndTime(doctorUserId, date, time);
            if (existing.isPresent()) {
                return Optional.empty();
            }
        }

        Appointment appointment = new Appointment();
        appointment.setPatient(optionalPatient.get());
        if (optionalDoctor.isPresent()) {
            appointment.setDoctor(optionalDoctor.get());
        }
        appointment.setDate(date);
        appointment.setTime(time);
        appointment.setStatus("BOOKED");
        if (hospitalLocation != null) {
            appointment.setHospitalLocation(hospitalLocation);
        }
        if (department != null) {
            appointment.setDepartment(department);
        }
        if (diseaseName != null) {
            appointment.setDiseaseName(diseaseName);
        }
        if (patientContactNumber != null) {
            appointment.setPatientContactNumber(patientContactNumber);
        }
        if (notes != null) {
            appointment.setNotes(notes);
        }
        if (appointmentType != null && (appointmentType.equals("ONLINE") || appointmentType.equals("OFFLINE"))) {
            appointment.setAppointmentType(appointmentType);
        }

        Appointment saved = appointmentRepository.save(appointment);

        // Notify patient
        notificationService.createNotification(
                patientUserId,
                "Your appointment has been booked for " + date + " at " + time + ".",
                "APPOINTMENT_BOOKED",
                saved.getId()
        );

        return Optional.of(saved);
    }

    public List<Appointment> getAppointmentsForDoctor(Long doctorUserId) {
        Optional<Doctor> d = doctorRepository.findByUserId(doctorUserId);
        return d.isPresent() ? appointmentRepository.findByDoctorId(d.get().getId()) : java.util.Collections.emptyList();
    }

    public List<Appointment> getAppointmentsForPatient(Long patientUserId) {
        Optional<Patient> p = patientRepository.findByUserId(patientUserId);
        return p.isPresent() ? appointmentRepository.findByPatientId(p.get().getId()) : java.util.Collections.emptyList();
    }

    @org.springframework.transaction.annotation.Transactional
    public Optional<Appointment> updateAppointmentStatus(Long appointmentId, Long doctorId, String status) {
        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isEmpty()) {
            return Optional.empty();
        }
        Appointment appointment = optionalAppointment.get();
        if (appointment.getDoctor() == null || !appointment.getDoctor().getId().equals(doctorId)) {
            return Optional.empty();
        }
        appointment.setStatus(status);
        Appointment saved = appointmentRepository.save(appointment);

        // Notify patient
        notificationService.createNotification(
                appointment.getPatient().getUser().getId(),
                "Your appointment status has been updated to " + status + ".",
                "APPOINTMENT_UPDATE",
                saved.getId()
        );

        return Optional.of(saved);
    }

    public long getTotalAppointments() {
        return appointmentRepository.count();
    }

    @org.springframework.transaction.annotation.Transactional
    public boolean deleteAppointment(Long id, Long requesterUserId) {
        Optional<com.hcms.entity.User> userOpt = userRepository.findById(requesterUserId);
        if (userOpt.isEmpty() || !"ADMIN".equalsIgnoreCase(userOpt.get().getRole())) {
            return false;
        }
        if (appointmentRepository.existsById(id)) {
            appointmentRepository.deleteById(id);
            return true;
        }
        return false;
    }
}

