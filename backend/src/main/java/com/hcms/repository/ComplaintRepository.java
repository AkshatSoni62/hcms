package com.hcms.repository;

import com.hcms.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    long countByStatus(String status);

    List<Complaint> findAllByOrderByCreatedAtDesc();

    @Query("SELECT c FROM Complaint c WHERE (LOWER(c.title) LIKE LOWER(CONCAT('%', :kw, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :kw, '%')))")
    List<Complaint> searchComplaints(@Param("kw") String keyword);

    @Query("SELECT c FROM Complaint c WHERE (:cat IS NULL OR :cat = '' OR c.category = :cat) " +
            "AND (:sev IS NULL OR :sev = '' OR c.severity = :sev) " +
            "AND (:loc IS NULL OR :loc = '' OR c.hospitalLocation = :loc) " +
            "AND (:stat IS NULL OR :stat = '' OR c.status = :stat)")
    List<Complaint> findFiltered(@Param("cat") String category, @Param("sev") String severity,
            @Param("loc") String hospitalLocation, @Param("stat") String status);

    long countByCategory(String category);

    long countByHospitalLocation(String hospitalLocation);

    @Query("SELECT DISTINCT c.category FROM Complaint c WHERE c.category IS NOT NULL AND c.category != ''")
    List<String> findDistinctCategories();

    @Query("SELECT DISTINCT c.hospitalLocation FROM Complaint c WHERE c.hospitalLocation IS NOT NULL AND c.hospitalLocation != ''")
    List<String> findDistinctHospitalLocations();
}
