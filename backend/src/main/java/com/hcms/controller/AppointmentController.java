package com.hcms.controller;

import com.hcms.entity.Appointment;
import com.hcms.service.AppointmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public ResponseEntity<Appointment> bookAppointment(@RequestParam Long patientUserId,
                                                       @RequestParam(required = false) Long doctorUserId,
                                                       @RequestParam String date,
                                                       @RequestParam String time,
                                                       @RequestParam(required = false) String hospitalLocation,
                                                       @RequestParam(required = false) String department,
                                                       @RequestParam(required = false) String diseaseName,
                                                       @RequestParam(required = false) String patientContactNumber,
                                                       @RequestParam(required = false) String notes,
                                                       @RequestParam(required = false) String appointmentType) {
        LocalDate localDate = LocalDate.parse(date);
        LocalTime localTime = LocalTime.parse(time);
        Optional<Appointment> appointment =
                appointmentService.bookAppointment(patientUserId, doctorUserId, localDate, localTime,
                        hospitalLocation, department, diseaseName, patientContactNumber, notes, appointmentType);
        return appointment.map(value -> new ResponseEntity<>(value, HttpStatus.CREATED))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.BAD_REQUEST));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Appointment>> getAppointmentsForDoctor(@PathVariable Long doctorId) {
        List<Appointment> appointments = appointmentService.getAppointmentsForDoctor(doctorId);
        return new ResponseEntity<>(appointments, HttpStatus.OK);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Appointment>> getAppointmentsForPatient(@PathVariable Long patientId) {
        List<Appointment> appointments = appointmentService.getAppointmentsForPatient(patientId);
        return new ResponseEntity<>(appointments, HttpStatus.OK);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Appointment> updateAppointmentStatus(@PathVariable("id") Long id,
                                                               @RequestParam Long doctorId,
                                                               @RequestParam String status) {
        Optional<Appointment> updated = appointmentService.updateAppointmentStatus(id, doctorId, status);
        return updated.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.FORBIDDEN));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable("id") Long id,
                                                  @RequestParam Long requesterUserId) {
        boolean deleted = appointmentService.deleteAppointment(id, requesterUserId);
        if (deleted) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }
        return new ResponseEntity<>(HttpStatus.FORBIDDEN);
    }
}

