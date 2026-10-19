package com.tourguide.translation_service;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.tourguide.translation_service.model.TranslatedItem;
import com.tourguide.translation_service.service.TranslationManagerService;

/**
 * Lắng nghe narration.created -> dịch đa ngôn ngữ -> phát translation.completed.
 */
@Component
public class NarrationEventsListener {

    private static final Logger log = LoggerFactory.getLogger(NarrationEventsListener.class);

    private final EventPublisher publisher;
    private final TranslationManagerService translationManager;
    private final Set<String> processedEventIds = ConcurrentHashMap.newKeySet();

    public NarrationEventsListener(EventPublisher publisher, TranslationManagerService translationManager) {
        this.publisher = publisher;
        this.translationManager = translationManager;
    }

    @RabbitListener(queues = RabbitConfig.QUEUE_NARRATION_CREATED)
    public void onNarrationCreated(NarrationCreatedEvent event) {
        if (event == null || event.eventId() == null) {
            log.warn("[translation-service] Bỏ qua sự kiện không hợp lệ");
            return;
        }

        // Chống xử lý trùng lặp theo eventId (idempotency)
        if (!processedEventIds.add(event.eventId())) {
            log.warn("[translation-service] Sự kiện eventId={} đã được xử lý trước đó, bỏ qua", event.eventId());
            return;
        }

        log.info("[translation-service] BẮT ĐẦU DỊCH: poiId={}, version={}, langs={}, eventId={}",
                event.poiId(), event.version(), event.langs(), event.eventId());

        // Tiến hành dịch cho từng ngôn ngữ được yêu cầu
        List<TranslatedItem> translatedItems = translationManager.processNarrationTranslation(
                event.poiId(),
                event.version(),
                event.langs() != null ? event.langs() : List.of("vi", "en", "zh")
        );

        List<String> completedLangs = translatedItems.stream()
                .map(TranslatedItem::lang)
                .distinct()
                .toList();

        // Phát sự kiện hoàn tất dịch thuật theo đúng hợp đồng EVENTS.md
        TranslationCompletedEvent completedEvent = new TranslationCompletedEvent(
                UUID.randomUUID().toString(),
                event.eventId(),
                event.poiId(),
                event.version(),
                completedLangs,
                Instant.now().toString()
        );

        publisher.publish(RabbitConfig.RK_TRANSLATION_COMPLETED, completedEvent);
        log.info("[translation-service] HOÀN TẤT DỊCH THUẬT: poiId={}, version={}, langs={}",
                event.poiId(), event.version(), completedLangs);
    }
}

