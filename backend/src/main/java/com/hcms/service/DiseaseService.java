package com.hcms.service;

import com.hcms.entity.Disease;
import com.hcms.repository.DiseaseRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class DiseaseService {

    private final DiseaseRepository diseaseRepository;

    public DiseaseService(DiseaseRepository diseaseRepository) {
        this.diseaseRepository = diseaseRepository;
    }

    public Disease addDisease(Disease disease) {
        return diseaseRepository.save(disease);
    }

    public Optional<Disease> updateDisease(Long id, Disease updatedDisease) {
        Optional<Disease> optionalDisease = diseaseRepository.findById(id);
        if (optionalDisease.isEmpty()) {
            return Optional.empty();
        }
        Disease existing = optionalDisease.get();
        existing.setName(updatedDisease.getName());
        existing.setDescription(updatedDisease.getDescription());
        existing.setSymptoms(updatedDisease.getSymptoms());
        existing.setPreventionTips(updatedDisease.getPreventionTips());
        return Optional.of(diseaseRepository.save(existing));
    }

    public boolean deleteDisease(Long id) {
        Optional<Disease> optionalDisease = diseaseRepository.findById(id);
        if (optionalDisease.isEmpty()) {
            return false;
        }
        diseaseRepository.delete(optionalDisease.get());
        return true;
    }

    public List<Disease> getAllDiseases() {
        return diseaseRepository.findAll();
    }
}

