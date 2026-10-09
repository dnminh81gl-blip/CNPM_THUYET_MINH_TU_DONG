package com.example.demo;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * ĐƯỜNG DẪN THỬ NGHIỆM: mô phỏng việc admin bấm "Xuất bản" một địa điểm.
 * Mở trên trình duyệt:  http://localhost:8081/api/test/publish?poiId=3&version=1
 * (Dùng GET cho tiện thử bằng trình duyệt; khi làm thật sẽ đổi sang POST.)
 */
@RestController
@RequestMapping("/api/test")
public class TestController {

    private final EventPublisher publisher;

    public TestController(EventPublisher publisher) {
        this.publisher = publisher;
    }

    @GetMapping("/publish")
    public ContentPublishedEvent publish(@RequestParam(defaultValue = "3") long poiId,
                                         @RequestParam(defaultValue = "1") int version) {
        ContentPublishedEvent event = new ContentPublishedEvent(
                UUID.randomUUID().toString(), poiId, version, List.of("vi", "en", "zh"), Instant.now().toString());
        publisher.publish(RabbitConfig.RK_CONTENT_PUBLISHED, event);
        return event;   // trả lại chính sự kiện vừa gửi để bạn nhìn thấy trên trình duyệt
    }
}
