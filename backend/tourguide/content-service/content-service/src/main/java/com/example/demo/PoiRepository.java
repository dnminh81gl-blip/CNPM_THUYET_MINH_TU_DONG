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
 * Dữ liệu mẫu = 6 điểm thuyết minh (POI) trong khuôn viên Dinh Độc Lập, giống trang web.
 */
@Repository
public class PoiRepository {

    private final Map<Long, Poi> store = new ConcurrentHashMap<>();
    private final AtomicLong nextId = new AtomicLong(1);

    public PoiRepository() {
        seed("Cổng chính và xe tăng", "Khuôn viên", "Cổng chính phía đường Lê Duẩn", 10.7779, 106.6964, 30,
                "Bạn đang đứng ở cổng chính Dinh Độc Lập. Trưa ngày 30 tháng 4 năm 1975, xe tăng 390 húc đổ cánh cổng này, đánh dấu thời khắc kết thúc chiến tranh và thống nhất đất nước. Hai chiếc xe tăng trưng bày trong khuôn viên tái hiện xe tăng 843 và 390 đã tiến vào Dinh hôm đó.");
        seed("Mặt tiền và kiến trúc", "Khuôn viên", "Bãi cỏ trước mặt tiền Dinh", 10.77745, 106.69585, 30,
                "Dinh Độc Lập do kiến trúc sư Ngô Viết Thụ thiết kế, khởi công năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, trên nền Dinh Norodom cũ thời Pháp. Mặt tiền nổi bật với những hàng rèm hoa đá mô phỏng đốt trúc, vừa che nắng vừa mang nét kiến trúc truyền thống Á Đông.");
        seed("Phòng Trình Quốc thư", "Bên trong Dinh", "Bên trong Dinh", 10.77712, 106.69548, 15,
                "Đây là phòng Trình Quốc thư, nơi các đại sứ nước ngoài trình thư uỷ nhiệm. Điểm nhấn của căn phòng là bức tranh sơn mài lớn Bình Ngô Đại Cáo gồm 40 tấm ghép lại, của hoạ sĩ Nguyễn Văn Minh.");
        seed("Phòng họp Nội các", "Bên trong Dinh", "Bên trong Dinh", 10.77695, 106.69528, 15,
                "Phòng họp Nội các là nơi Tổng thống họp với các bộ trưởng. Căn phòng vẫn giữ bàn họp dài và hàng ghế như thời kỳ trước năm 1975, giúp du khách hình dung cách bộ máy chính quyền làm việc tại đây.");
        seed("Sân thượng và trực thăng", "Sân thượng", "Sân thượng", 10.7768, 106.69512, 15,
                "Trên sân thượng có bãi đáp trực thăng. Chiếc trực thăng UH-1 trưng bày ở đây là loại từng phục vụ Tổng thống. Ngày 8 tháng 4 năm 1975, phi công Nguyễn Thành Trung lái máy bay F-5E ném bom Dinh; các vị trí trúng bom được đánh dấu bằng vòng tròn đỏ trên sân thượng.");
        seed("Tầng hầm chỉ huy", "Tầng hầm", "Tầng hầm", 10.77666, 106.69496, 15,
                "Tầng hầm là hệ thống hầm chỉ huy kiên cố, được xây để chịu được bom. Bên trong có phòng thông tin liên lạc, phòng bản đồ tác chiến và phòng nghỉ của Tổng thống, cùng nhiều máy điện đàm vẫn còn được lưu giữ.");
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
