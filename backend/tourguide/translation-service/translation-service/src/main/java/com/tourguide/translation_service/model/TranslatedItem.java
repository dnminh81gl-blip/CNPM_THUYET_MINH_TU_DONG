package com.tourguide.translation_service.model;

import java.time.Instant;

/**
 * Bản ghi chi tiết một bản dịch của địa điểm thuyết minh.
 */
public record TranslatedItem(
        long poiId,
        int version,
        String lang,
        String originalText,
        String translatedText,
        String sourceLang,
        String engine,
        String translatedAt
) {
    public static TranslatedItem of(long poiId, int version, String lang, String originalText,
                                   String translatedText, String sourceLang, String engine) {
        return new TranslatedItem(poiId, version, lang, originalText, translatedText,
                sourceLang, engine, Instant.now().toString());
    }
}
