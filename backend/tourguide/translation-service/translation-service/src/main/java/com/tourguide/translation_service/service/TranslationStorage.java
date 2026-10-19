package com.tourguide.translation_service.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.tourguide.translation_service.model.TranslatedItem;

/**
 * Kho lưu trữ (trong bộ nhớ) các bản dịch và bản gốc thuyết minh của các điểm POI.
 * KHÔNG còn câu mẫu viết sẵn: bản gốc đến từ sự kiện narration.created (script.vi),
 * tức là nội dung thật do Admin nhập ở content-service.
 */
@Service
public class TranslationStorage {

    // Key: poiId + ":" + version + ":" + lang
    private final Map<String, TranslatedItem> storage = new ConcurrentHashMap<>();

    // Bản gốc tiếng Việt gần nhất đã nhận cho mỗi POI
    private final Map<Long, String> originalNarrations = new ConcurrentHashMap<>();

    /**
     * Lấy bản gốc tiếng Việt gần nhất của một POI; null nếu chưa nhận được.
     */
    public String getOriginalNarration(long poiId) {
        return originalNarrations.get(poiId);
    }

    /**
     * Ghi nhận bản gốc tiếng Việt của một POI (lấy từ sự kiện narration.created).
     */
    public void setOriginalNarration(long poiId, String text) {
        if (text != null && !text.isBlank()) {
            originalNarrations.put(poiId, text);
        }
    }

    /**
     * Lưu trữ một bản dịch.
     */
    public void save(TranslatedItem item) {
        String key = buildKey(item.poiId(), item.version(), item.lang());
        storage.put(key, item);
    }

    /**
     * Tìm bản dịch theo POI, version và ngôn ngữ.
     */
    public TranslatedItem find(long poiId, int version, String lang) {
        return storage.get(buildKey(poiId, version, lang));
    }

    /**
     * Lấy tất cả các bản dịch của một POI theo phiên bản.
     */
    public List<TranslatedItem> findByPoiAndVersion(long poiId, int version) {
        List<TranslatedItem> result = new ArrayList<>();
        String prefix = poiId + ":" + version + ":";
        for (Map.Entry<String, TranslatedItem> entry : storage.entrySet()) {
            if (entry.getKey().startsWith(prefix)) {
                result.add(entry.getValue());
            }
        }
        return result;
    }

    /**
     * Lấy toàn bộ số lượng bản dịch đã lưu.
     */
    public int count() {
        return storage.size();
    }

    private String buildKey(long poiId, int version, String lang) {
        return poiId + ":" + version + ":" + lang.toLowerCase();
    }
}
