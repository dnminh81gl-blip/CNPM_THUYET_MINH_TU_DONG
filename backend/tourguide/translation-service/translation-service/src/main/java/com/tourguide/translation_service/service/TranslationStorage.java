package com.tourguide.translation_service.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.tourguide.translation_service.model.TranslatedItem;

/**
 * Kho lưu trữ và cache các bản dịch thuyết minh của các điểm POI.
 */
@Service
public class TranslationStorage {

    // Key: poiId + ":" + version + ":" + lang
    private final Map<String, TranslatedItem> storage = new ConcurrentHashMap<>();

    // Mẫu văn bản thuyết minh gốc (tiếng Việt) cho các điểm POI du lịch phổ biến
    private final Map<Long, String> samplePoiNarrations = new ConcurrentHashMap<>();

    public TranslationStorage() {
        initSampleNarrations();
    }

    private void initSampleNarrations() {
        samplePoiNarrations.put(1L, "Chào mừng bạn đến với Chùa Một Cột, một trong những biểu tượng văn hóa và di tích lịch sử ngàn năm văn hiến của thủ đô Hà Nội với kiến trúc độc đáo tựa đài sen trên mặt nước.");
        samplePoiNarrations.put(2L, "Chào mừng bạn đến với Văn Miếu - Quốc Tử Giám, trường đại học đầu tiên của Việt Nam, nơi lưu giữ tinh hoa học vấn và truyền thống tôn sư trọng đạo.");
        samplePoiNarrations.put(3L, "Chào mừng bạn đến với Dinh Độc Lập, công trình kiến trúc lịch sử nổi bật tại Thành phố Hồ Chí Minh, gắn liền với cột mốc thống nhất đất nước.");
        samplePoiNarrations.put(4L, "Chào mừng bạn đến với Nhà thờ Đức Bà, tuyệt tác kiến trúc Pháp cổ kính giữa lòng Sài Gòn.");
        samplePoiNarrations.put(5L, "Chào mừng bạn đến với Phố cổ Hội An, di sản văn hóa thế giới với những ngôi nhà cổ mái ngói rêu phong và đèn lồng rực rỡ.");
    }

    /**
     * Lấy văn bản thuyết minh gốc của một địa điểm (nếu chưa có thì sinh câu mặc định).
     */
    public String getOriginalNarration(long poiId, int version) {
        return samplePoiNarrations.getOrDefault(poiId,
                String.format("Chào mừng quý khách đến với địa điểm tham quan du lịch số %d. Đây là bản thuyết minh tự động giới thiệu về lịch sử, văn hóa và kiến trúc nổi bật của điểm đến này.", poiId));
    }

    /**
     * Đăng ký thêm nội dung thuyết minh mới cho một POI.
     */
    public void setOriginalNarration(long poiId, String text) {
        if (text != null && !text.isBlank()) {
            samplePoiNarrations.put(poiId, text);
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
