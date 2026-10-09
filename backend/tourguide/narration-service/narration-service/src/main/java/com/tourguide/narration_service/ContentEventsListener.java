package com.tourguide.narration_service;

import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Lắng nghe hàng đợi: mỗi khi có tin mới, hàm bên dưới tự động được gọi. */
@Component
public class ContentEventsListener {

    private static final Logger log = LoggerFactory.getLogger(ContentEventsListener.class);

    private final EventPublisher publisher;

    public ContentEventsListener(EventPublisher publisher) {
        this.publisher = publisher;
    }

    @RabbitListener(queues = RabbitConfig.QUEUE_CONTENT_PUBLISHED)
    public void onContentPublished(ContentPublishedEvent event) {
        log.info("[narration-service] NHẬN content.published: poiId={}, version={}, langs={}, eventId={}, publishedAt={}",
                event.poiId(), event.version(), event.langs(), event.eventId(), event.publishedAt());
        // TODO: tạo/cập nhật bản thuyết minh thật cho poiId này ở đây.

        publisher.publish(RabbitConfig.RK_NARRATION_CREATED, new NarrationCreatedEvent(
                UUID.randomUUID().toString(), event.eventId(), event.poiId(), event.version(),
                event.langs(), Instant.now().toString()));
    }
}
