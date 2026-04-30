package com.hcms.service;

import com.hcms.entity.Hospital;
import com.hcms.repository.HospitalRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HospitalService {

    private final HospitalRepository hospitalRepository;

    public HospitalService(HospitalRepository hospitalRepository) {
        this.hospitalRepository = hospitalRepository;
    }

    public List<Hospital> getAllHospitals() {
        return hospitalRepository.findAllByOrderByNameAsc();
    }

    public Hospital save(Hospital hospital) {
        return hospitalRepository.save(hospital);
    }
}
