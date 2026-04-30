package com.hcms.repository;

import com.hcms.entity.OtpRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface OtpRepository extends JpaRepository<OtpRecord, String> {
    // Primary Key is now String (Email), so findById handles everything
}
