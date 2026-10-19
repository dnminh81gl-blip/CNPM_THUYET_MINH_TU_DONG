package com.example.demo;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Repository;

/**
 * Kho địa điểm, tạm lưu TRONG BỘ NHỚ (khởi động lại thì về dữ liệu mẫu).
 * Bước sau (việc T14) thay bằng PostgreSQL; các lớp khác không phải sửa vì chỉ gọi qua lớp này.
 * Dữ liệu mẫu = 5 địa điểm ở Quận 1 giống trang web.
 */
@Repository
public class PoiRepository {

    private final Map<Long, Poi> store = new ConcurrentHashMap<>();
    private final AtomicLong nextId = new AtomicLong(1);

    public PoiRepository() {
        seed("Dinh Độc Lập", "Di tích lịch sử", "135 Nam Kỳ Khởi Nghĩa, P. Bến Thành, Q.1, TP.HCM", 10.7769, 106.6953, 60,
                "Dinh Độc Lập hoàn thành năm 1966, là công trình nổi tiếng với kiến trúc hiện đại. Nơi đây gắn liền với sự kiện lịch sử ngày 30 tháng 4 năm 1975.");
        seed("Bưu điện Trung tâm Sài Gòn", "Kiến trúc", "02 Công xã Paris, P. Bến Nghé, Q.1, TP.HCM", 10.7800, 106.6999, 40,
                "Bưu điện Trung tâm Sài Gòn được xây dựng vào cuối thế kỷ 19 theo phong cách kiến trúc Pháp. Mái vòm khung sắt và những ô cửa sổ lớn là điểm nhấn của công trình.");
        seed("Nhà thờ Đức Bà", "Di tích lịch sử", "01 Công xã Paris, P. Bến Nghé, Q.1, TP.HCM", 10.7798, 106.6990, 60,
                "Nhà thờ Đức Bà Sài Gòn được xây dựng từ năm 1863 đến 1880, nổi bật với gạch đỏ và hai tháp chuông cao gần 60 mét. Đây là một trong những biểu tượng kiến trúc của thành phố.");
        seed("Nhà hát Thành phố", "Văn hóa nghệ thuật", "07 Công trường Lam Sơn, P. Bến Nghé, Q.1, TP.HCM", 10.7766, 106.7031, 50,
                "Nhà hát Thành phố khánh thành năm 1900 theo phong cách Pháp. Đây là nơi diễn ra nhiều chương trình âm nhạc, ballet và kịch nghệ.");
        seed("Bảo tàng Thành phố Hồ Chí Minh", "Bảo tàng", "65 Lý Tự Trọng, P. Bến Nghé, Q.1, TP.HCM", 10.7777, 106.7003, 50,
                "Đây là điểm dừng chân để tìm hiểu lịch sử và văn hóa của thành phố qua các hiện vật và tư liệu trưng bày.");
    }

    private void seed(String name, String category, String address, double lat, double lng, int radius, String text) {
        long id = nextId.getAndIncrement();
        store.put(id, new Poi(id, name, category, address, lat, lng, radius, text, 1, Poi.PUBLISHED, Instant.now().toString()));
    }

    public List<Poi> findAll() {
        return store.values().stream().sorted(Comparator.comparingLong(Poi::id)).toList();
    }

    public Optional<Poi> findById(long id) {
        return Optional.ofNullable(store.get(id));
    }

    public long newId() {
        return nextId.getAndIncrement();
    }

    public Poi save(Poi poi) {
        store.put(poi.id(), poi);
        return poi;
    }
}
