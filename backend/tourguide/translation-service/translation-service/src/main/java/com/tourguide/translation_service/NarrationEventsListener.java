package com.tourguide.translation_service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
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
 * Lắng nghe narration.created -> dịch bài thuyết minh THẬT (script.vi) sang các ngôn ngữ
 * -> phát translation.completed kèm scripts.
 */
@Component
public class NarrationEventsListener {

    private static final Logger log = LoggerFactory.getLogger(NarrationEventsListener.class);
    private static final List<String> DEFAULT_LANGS = List.of("vi", "en", "zh");

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

        List<String> langs = event.langs() != null && !event.langs().isEmpty() ? event.langs() : DEFAULT_LANGS;
        String sourceText = event.sourceText();

        log.info("[translation-service] BẮT ĐẦU DỊCH: poiId={}, version={}, langs={}, coBanGoc={}, eventId={}",
                event.poiId(), event.version(), langs, sourceText != null, event.eventId());

        // Dịch nội dung thật; nếu sự kiện không kèm script thì dùng bản gốc đã nhận trước đó của POI
        List<TranslatedItem> translatedItems =
                translationManager.processNarrationTranslation(event.poiId(), event.version(), langs, sourceText);

        List<String> completedLangs = translatedItems.stream()
                .map(TranslatedItem::lang)
                .distinct()
                .toList();
        Map<String, String> scripts = TranslationManagerService.toScripts(translatedItems);

        // Phát sự kiện hoàn tất dịch thuật theo đúng hợp đồng EVENTS.md
        TranslationCompletedEvent completedEvent = new TranslationCompletedEvent(
                UUID.randomUUID().toString(),
                event.eventId(),
                event.poiId(),
                event.version(),
                completedLangs,
                Instant.now().toString(),
                scripts.isEmpty() ? null : scripts
        );

        publisher.publish(RabbitConfig.RK_TRANSLATION_COMPLETED, completedEvent);
        log.info("[translation-service] HOÀN TẤT DỊCH THUẬT: poiId={}, version={}, langs={}",
                event.poiId(), event.version(), completedLangs);
    }
}
