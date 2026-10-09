package com.tourguide.narration_service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Lắng nghe hàng đợi: mỗi khi có tin mới, hàm bên dưới tự động được gọi. */
@Component
public class ContentEventsListener {

    private static final Logger log = LoggerFactory.getLogger(ContentEventsListener.class);

    @RabbitListener(queues = RabbitConfig.QUEUE_CONTENT_PUBLISHED)
    public void onContentPublished(ContentPublishedEvent event) {
        log.info("[narration-service] NHẬN content.published: poiId={}, version={}, langs={}, eventId={}, publishedAt={}",
                event.poiId(), event.version(), event.langs(), event.eventId(), event.publishedAt());
        // TODO (các bước sau): tạo/cập nhật bản thuyết minh cho poiId này, rồi phát tiếp sự kiện cho TTS...
    }
}
