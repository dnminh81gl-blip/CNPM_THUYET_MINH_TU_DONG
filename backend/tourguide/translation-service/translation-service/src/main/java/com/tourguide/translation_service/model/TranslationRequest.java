package com.tourguide.translation_service.model;

/**
 * Yêu cầu dịch văn bản qua REST API.
 */
public record TranslationRequest(
        String text,
        String sourceLang,
        String targetLang
) {
}
