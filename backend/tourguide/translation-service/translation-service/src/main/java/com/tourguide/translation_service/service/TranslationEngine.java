package com.tourguide.translation_service.service;

/**
 * Interface cho các công cụ dịch thuật.
 */
public interface TranslationEngine {

    /**
     * Dịch văn bản từ ngôn ngữ nguồn sang ngôn ngữ đích.
     *
     * @param text       Đoạn văn bản cần dịch.
     * @param sourceLang Mã ngôn ngữ nguồn (ví dụ: "vi").
     * @param targetLang Mã ngôn ngữ đích (ví dụ: "en", "zh").
     * @return Văn bản đã được dịch.
     */
    String translate(String text, String sourceLang, String targetLang);

    /**
     * Tên nhận diện của công cụ dịch (dùng để ghi log và metadata).
     */
    String getEngineName();
}
