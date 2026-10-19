package com.tourguide.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * API Gateway: cong vao DUY NHAT cho Frontend (cong 8080).
 * Frontend chi can biet mot dia chi; gateway chuyen tiep toi dung service theo duong dan
 * (cau hinh trong application.yml) va xu ly CORS mot lan cho tat ca.
 */
@SpringBootApplication
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
