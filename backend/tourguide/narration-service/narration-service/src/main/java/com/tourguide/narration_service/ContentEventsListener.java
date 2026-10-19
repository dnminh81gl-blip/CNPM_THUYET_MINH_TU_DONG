package com.tourguide.narration_service;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Lắng nghe content.published -> soạn bài thuyết minh -> phát narration.created KÈM bài thuyết minh. */
@Component
public class ContentEventsListener {

    private static final Logger log = LoggerFactory.getLogger(ContentEventsListener.class);

    private final EventPublisher publisher;
    private final NarrationComposer composer;
    /* chống xử lý trùng theo eventId (RabbitMQ có thể giao lại một tin) */
    private final Set<String> processedEventIds = ConcurrentHashMap.newKeySet();

    public ContentEventsListener(EventPublisher publisher, NarrationComposer composer) {
        this.publisher = publisher;
        this.composer = composer;
    }

    @RabbitListener(queues = RabbitConfig.QUEUE_CONTENT_PUBLISHED)
    public void onContentPublished(ContentPublishedEvent event) {
        if (event == null || event.eventId() == null) {
            log.warn("[narration-service] Bo qua su kien khong hop le");
            return;
        }
        if (!processedEventIds.add(event.eventId())) {
            log.warn("[narration-service] Su kien eventId={} da xu ly truoc do, bo qua", event.eventId());
            return;
        }
        log.info("[narration-service] NHẬN content.published: poiId={}, version={}, name={}, langs={}, eventId={}",
                event.poiId(), event.version(), event.name(), event.langs(), event.eventId());

        String script = composer.compose(event.name(), event.text());
        if (script == null) {
            log.warn("[narration-service] Su kien poiId={} khong co noi dung (ben gui phien ban cu), gui narration.created khong kem bai", event.poiId());
        } else {
            log.info("[narration-service] Bai thuyet minh poiId={}: {}", event.poiId(), script);
        }

        publisher.publish(RabbitConfig.RK_NARRATION_CREATED, new NarrationCreatedEvent(
                UUID.randomUUID().toString(), event.eventId(), event.poiId(), event.version(),
                event.langs(), Instant.now().toString(),
                script == null ? null : Map.of("vi", script)));
    }
}
