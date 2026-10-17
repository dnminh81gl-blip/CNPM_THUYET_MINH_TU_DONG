package com.tourguide.translation_service.model;

/**
 * Kết quả trả về sau khi dịch một đoạn văn bản.
 */
public record TranslationResponse(
        String originalText,
        String translatedText,
        String sourceLang,
        String targetLang,
        String engine,
        boolean success,
        String message
) {
    public static TranslationResponse success(String original, String translated, String sourceLang, String targetLang, String engine) {
        return new TranslationResponse(original, translated, sourceLang, targetLang, engine, true, "Translation completed successfully");
    }

    public static TranslationResponse failure(String original, String sourceLang, String targetLang, String errorMessage) {
        return new TranslationResponse(original, original, sourceLang, targetLang, "none", false, errorMessage);
    }
}
