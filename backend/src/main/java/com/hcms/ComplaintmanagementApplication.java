package com.hcms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ComplaintmanagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(ComplaintmanagementApplication.class, args);
    }
}