-- HCMS database schema for MySQL 8
-- Target database: hcms_db

-- Run this file in MySQL Workbench with the hcms_db schema selected.

-- Drop tables in reverse dependency order (optional safety for re‑runs)
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS complaint_upvotes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS diseases;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- USERS
CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    role VARCHAR(50),
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DOCTORS
CREATE TABLE doctors (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255),
    specialization VARCHAR(255),
    user_id BIGINT,
    PRIMARY KEY (id),
    KEY idx_doctors_user_id (user_id),
    CONSTRAINT fk_doctors_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PATIENTS
CREATE TABLE patients (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255),
    age INT,
    gender VARCHAR(20),
    user_id BIGINT,
    PRIMARY KEY (id),
    KEY idx_patients_user_id (user_id),
    CONSTRAINT fk_patients_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- COMPLAINTS
CREATE TABLE complaints (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
    created_at DATETIME,
    user_id BIGINT,
    upvote_count INT DEFAULT 0,
    category VARCHAR(100), -- Room Hygiene, Bathroom issues, etc.
    PRIMARY KEY (id),
    KEY idx_complaints_user_id (user_id),
    CONSTRAINT fk_complaints_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- COMMENTS
CREATE TABLE comments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    content TEXT,
    created_at DATETIME,
    user_id BIGINT,
    complaint_id BIGINT,
    PRIMARY KEY (id),
    KEY idx_comments_user_id (user_id),
    KEY idx_comments_complaint_id (complaint_id),
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_comments_complaint
        FOREIGN KEY (complaint_id) REFERENCES complaints (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NOTIFICATIONS
CREATE TABLE notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    message VARCHAR(500),
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME,
    user_id BIGINT,
    PRIMARY KEY (id),
    KEY idx_notifications_user_id (user_id),
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- APPOINTMENTS
CREATE TABLE appointments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    patient_id BIGINT,
    doctor_id BIGINT,
    date DATE,
    time TIME,
    status VARCHAR(50),
    PRIMARY KEY (id),
    KEY idx_appointments_patient_id (patient_id),
    KEY idx_appointments_doctor_id (doctor_id),
    CONSTRAINT fk_appointments_patient
        FOREIGN KEY (patient_id) REFERENCES patients (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_appointments_doctor
        FOREIGN KEY (doctor_id) REFERENCES doctors (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DISEASES
CREATE TABLE diseases (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255),
    description TEXT,
    symptoms TEXT,
    prevention_tips TEXT,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- COMPLAINT_UPVOTES (Many‑to‑Many between complaints and users)
CREATE TABLE complaint_upvotes (
    complaint_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (complaint_id, user_id),
    KEY idx_upvotes_user_id (user_id),
    CONSTRAINT fk_upvotes_complaint
        FOREIGN KEY (complaint_id) REFERENCES complaints (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_upvotes_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: create an initial admin user (change email/password as needed)
-- INSERT INTO users (full_name, email, password, role)
-- VALUES ('System Admin', 'admin@hcms.local', 'admin', 'ADMIN');

