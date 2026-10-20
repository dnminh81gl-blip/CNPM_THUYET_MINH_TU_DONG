package com.example.demo;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

/**
 * Quản lý thiết bị quét QR để nghe thuyết minh (không cần tài khoản). Gọi qua gateway: http://localhost:8080/api/devices
 *   POST /api/devices/visits    web báo một lần mở trang (kèm hệ điều hành, trình duyệt, nguồn qr/web, POI của QR)
 *   POST /api/devices/listens   web báo một lần nghe thuyết minh
 *   GET  /api/devices           danh sách thiết bị (trang Admin)
 *   GET  /api/devices/stats     số liệu tổng hợp (trang Admin)
 */
@RestController
@RequestMapping("/api/devices")
@Validated
public class DeviceController {

    private final DeviceService service;

    public DeviceController(DeviceService service) {
        this.service = service;
    }

    @PostMapping("/visits")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Device visit(@Valid @RequestBody DeviceVisitRequest request) {
        return service.recordVisit(request);
    }

    @PostMapping("/listens")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Device listen(@Valid @RequestBody DeviceListenRequest request) {
        return service.recordListen(request);
    }

    @GetMapping
    public List<Device> list() {
        return service.list();
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return service.stats();
    }
}
