package com.tourguide.translation_service.service;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.tourguide.translation_service.model.TranslatedItem;
import com.tourguide.translation_service.model.TranslationResponse;

/**
 * Service điều phối dịch thuật: tự động ưu tiên dịch online và tự động chuyển sang
 * từ điển offline fallback nếu có sự cố mạng.
 */
@Service
public class TranslationManagerService {

    private static final Logger log = LoggerFactory.getLogger(TranslationManagerService.class);

    private final OnlineTranslationEngine onlineEngine;
    private final DictionaryFallbackEngine fallbackEngine;
    private final TranslationStorage storage;

    public TranslationManagerService(OnlineTranslationEngine onlineEngine,
                                     DictionaryFallbackEngine fallbackEngine,
                                     TranslationStorage storage) {
        this.onlineEngine = onlineEngine;
        this.fallbackEngine = fallbackEngine;
        this.storage = storage;
    }

    /**
     * Dịch một văn bản đơn lẻ, tự động fallback an toàn.
     */
    public TranslationResponse translateSingle(String text, String sourceLang, String targetLang) {
        if (text == null || text.isBlank()) {
            return TranslationResponse.failure(text, sourceLang, targetLang, "Văn bản rỗng");
        }

        if (sourceLang.equalsIgnoreCase(targetLang)) {
            return TranslationResponse.success(text, text, sourceLang, targetLang, "identity");
        }

        // Thử dịch trực tuyến trước
        try {
            String translated = onlineEngine.translate(text, sourceLang, targetLang);
            if (translated != null && !translated.isBlank()) {
                return TranslationResponse.success(text, translated, sourceLang, targetLang, onlineEngine.getEngineName());
            }
        } catch (Exception e) {
            log.info("[translation-service] Dịch online không khả dụng ({}), chuyển sang fallback từ điển", e.getMessage());
        }

        // Fallback sang bộ từ điển offline
        String fallbackTranslated = fallbackEngine.translate(text, sourceLang, targetLang);
        return TranslationResponse.success(text, fallbackTranslated, sourceLang, targetLang, fallbackEngine.getEngineName());
    }

    /**
     * Xử lý dịch đa ngôn ngữ cho một sự kiện thuyết minh (narration).
     */
    public List<TranslatedItem> processNarrationTranslation(long poiId, int version, List<String> targetLangs) {
        String baseContent = storage.getOriginalNarration(poiId, version);
        String sourceLang = "vi"; // Ngôn ngữ gốc mặc định

        List<TranslatedItem> results = new ArrayList<>();

        for (String lang : targetLangs) {
            try {
                TranslationResponse response = translateSingle(baseContent, sourceLang, lang);
                TranslatedItem item = TranslatedItem.of(
                        poiId,
                        version,
                        lang,
                        baseContent,
                        response.translatedText(),
                        sourceLang,
                        response.engine()
                );
                storage.save(item);
                results.add(item);
                log.info("[translation-service] Đã dịch poiId={}, version={}, lang={}, engine={}",
                        poiId, version, lang, response.engine());
            } catch (Exception e) {
                log.error("[translation-service] Lỗi khi dịch poiId={} sang lang={}: {}", poiId, lang, e.getMessage());
            }
        }

        return results;
    }

    public TranslationStorage getStorage() {
        return storage;
    }
}
