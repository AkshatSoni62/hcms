package com.hcms.entity;

import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "otp_records")
public class OtpRecord implements Serializable {

    @Id
    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false)
    private String otp;

    @Column(nullable = false)
    private long expiryTime;

    public OtpRecord() {}

    public OtpRecord(String email, String otp, long expiryTime) {
        this.email = email;
        this.otp = otp;
        this.expiryTime = expiryTime;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public long getExpiryTime() { return expiryTime; }
    public void setExpiryTime(long expiryTime) { this.expiryTime = expiryTime; }
}
