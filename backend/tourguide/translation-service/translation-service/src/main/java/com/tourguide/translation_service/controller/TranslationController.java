package com.tourguide.translation_service.controller;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tourguide.translation_service.EventPublisher;
import com.tourguide.translation_service.RabbitConfig;
import com.tourguide.translation_service.TranslationCompletedEvent;
import com.tourguide.translation_service.model.TranslatedItem;
import com.tourguide.translation_service.model.TranslationRequest;
import com.tourguide.translation_service.model.TranslationResponse;
import com.tourguide.translation_service.service.TranslationManagerService;

/**
 * REST API của translation-service (cổng 8083).
 */
@RestController
@RequestMapping("/api")
public class TranslationController {

    private final TranslationManagerService translationManager;
    private final EventPublisher publisher;

    public TranslationController(TranslationManagerService translationManager, EventPublisher publisher) {
        this.translationManager = translationManager;
        this.publisher = publisher;
    }

    /**
     * Kiểm tra trạng thái hoạt động của dịch vụ dịch thuật.
     */
    @GetMapping("/translations/status")
    public Map<String, Object> getStatus() {
        return Map.of(
                "service", "translation-service",
                "status", "UP",
                "supportedLanguages", List.of("vi", "en", "zh"),
                "totalStoredTranslations", translationManager.getStorage().count()
        );
    }

    /**
     * Tra cứu các bản dịch đã hoàn tất cho một địa điểm (POI).
     */
    @GetMapping("/translations")
    public List<TranslatedItem> getTranslations(
            @RequestParam long poiId,
            @RequestParam(defaultValue = "1") int version) {
        return translationManager.getStorage().findByPoiAndVersion(poiId, version);
    }

    /**
     * Dịch nhanh một đoạn văn bản theo yêu cầu (POST).
     */
    @PostMapping("/translations/translate")
    public ResponseEntity<TranslationResponse> translateText(@RequestBody TranslationRequest request) {
        if (request == null || request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest().body(
                    TranslationResponse.failure("", "vi", "en", "Văn bản không được để trống")
            );
        }

        String sourceLang = request.sourceLang() != null ? request.sourceLang() : "vi";
        String targetLang = request.targetLang() != null ? request.targetLang() : "en";

        TranslationResponse response = translationManager.translateSingle(request.text(), sourceLang, targetLang);
        return ResponseEntity.ok(response);
    }

    /**
     * ENDPOINT THỬ NGHIỆM TƯƠNG TỰ TESTCONTROLLER CỦA CONTENT-SERVICE:
     * Dễ dàng test trên trình duyệt: http://localhost:8083/api/test/translate?poiId=3&version=1&langs=vi,en,zh
     * Kích hoạt xử lý dịch cho poiId và phát sự kiện translation.completed lên RabbitMQ.
     */
    @GetMapping("/test/translate")
    public Map<String, Object> testTranslate(
            @RequestParam(defaultValue = "3") long poiId,
            @RequestParam(defaultValue = "1") int version,
            @RequestParam(defaultValue = "vi,en,zh") String langs) {

        List<String> langList = Arrays.stream(langs.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        List<TranslatedItem> items = translationManager.processNarrationTranslation(poiId, version, langList);

        List<String> completedLangs = items.stream().map(TranslatedItem::lang).toList();
        TranslationCompletedEvent event = new TranslationCompletedEvent(
                UUID.randomUUID().toString(),
                "test-manual-source-" + UUID.randomUUID(),
                poiId,
                version,
                completedLangs,
                Instant.now().toString()
        );

        publisher.publish(RabbitConfig.RK_TRANSLATION_COMPLETED, event);

        return Map.of(
                "message", "Đã xử lý dịch và phát sự kiện translation.completed thành công",
                "event", event,
                "translations", items
        );
    }
}
