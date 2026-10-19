package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * ĐƯỜNG DẪN THỬ NGHIỆM (giữ lại cho tiện demo bằng trình duyệt):
 *   http://localhost:8080/api/test/publish?poiId=3   (qua api-gateway)
 * Nay xuất bản NỘI DUNG THẬT của địa điểm poiId (giống POST /api/pois/{id}/publish).
 * Tham số version cũ được bỏ qua: version lấy từ địa điểm.
 */
@RestController
@RequestMapping("/api/test")
public class TestController {

    private final PoiService service;

    public TestController(PoiService service) {
        this.service = service;
    }

    @GetMapping("/publish")
    public ContentPublishedEvent publish(@RequestParam(defaultValue = "3") long poiId) {
        return service.publish(poiId);   // trả lại sự kiện vừa gửi để nhìn thấy trên trình duyệt
    }
}
