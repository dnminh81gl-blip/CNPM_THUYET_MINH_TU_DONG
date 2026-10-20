package com.example.demo;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

/**
 * Thống kê thiết bị quét QR / mở web để nghe thuyết minh. Du khách KHÔNG cần tài khoản:
 * mỗi trình duyệt tự tạo một mã ngẫu nhiên (deviceId). Dữ liệu tạm lưu trong bộ nhớ (T14 chuyển sang PostgreSQL).
 */
@Service
public class DeviceService {

    /** Thiết bị hoạt động trong khoảng này được tính là "đang dùng". */
    public static final Duration ACTIVE_WINDOW = Duration.ofMinutes(15);
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private final Map<String, Device> devices = new ConcurrentHashMap<>();
    /** poiId -> số lượt nghe */
    private final Map<Long, Integer> listensByPoi = new ConcurrentHashMap<>();
    /** poiId -> số lượt quét QR riêng của POI đó */
    private final Map<Long, Integer> scansByPoi = new ConcurrentHashMap<>();
    private final Clock clock;

    public DeviceService() {
        this(Clock.systemUTC());
    }

    DeviceService(Clock clock) {
        this.clock = clock;
    }

    public Device recordVisit(DeviceVisitRequest r) {
        String now = Instant.now(clock).toString();
        if ("qr".equals(r.src()) && r.poiId() != null) {
            scansByPoi.merge(r.poiId(), 1, Integer::sum);
        }
        return devices.compute(r.deviceId(), (id, old) -> old == null
                ? new Device(id, or(r.os()), or(r.browser()), or(r.type()), or(r.lang()), r.src() == null ? "web" : r.src(), now, now, 1, 0)
                : new Device(id, pick(r.os(), old.os()), pick(r.browser(), old.browser()), pick(r.type(), old.type()),
                        pick(r.lang(), old.lang()), old.firstSrc(), old.firstSeen(), now, old.visits() + 1, old.listens()));
    }

    public Device recordListen(DeviceListenRequest r) {
        String now = Instant.now(clock).toString();
        listensByPoi.merge(r.poiId(), 1, Integer::sum);
        return devices.compute(r.deviceId(), (id, old) -> old == null
                ? new Device(id, "Khác", "Khác", "Khác", or(r.lang()), "web", now, now, 1, 1)
                : new Device(id, old.os(), old.browser(), old.type(), pick(r.lang(), old.lang()), old.firstSrc(),
                        old.firstSeen(), now, old.visits(), old.listens() + 1));
    }

    /** Danh sách thiết bị, mới hoạt động gần nhất lên đầu. */
    public List<Device> list() {
        return devices.values().stream().sorted(Comparator.comparing(Device::lastSeen).reversed()).toList();
    }

    public Map<String, Object> stats() {
        Instant now = Instant.now(clock);
        LocalDate today = LocalDate.ofInstant(now, VN);
        List<Device> all = list();
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("totalDevices", all.size());
        s.put("todayDevices", all.stream().filter(d -> LocalDate.ofInstant(Instant.parse(d.lastSeen()), VN).equals(today)).count());
        s.put("activeDevices", all.stream().filter(d -> Duration.between(Instant.parse(d.lastSeen()), now).compareTo(ACTIVE_WINDOW) <= 0).count());
        s.put("qrDevices", all.stream().filter(d -> "qr".equals(d.firstSrc())).count());
        s.put("totalVisits", all.stream().mapToInt(Device::visits).sum());
        s.put("totalListens", all.stream().mapToInt(Device::listens).sum());
        s.put("byOs", count(all, Device::os));
        s.put("byBrowser", count(all, Device::browser));
        s.put("byType", count(all, Device::type));
        s.put("byLang", count(all, Device::lang));
        s.put("listensByPoi", new TreeMap<>(listensByPoi));
        s.put("scansByPoi", new TreeMap<>(scansByPoi));
        s.put("activeWindowMinutes", ACTIVE_WINDOW.toMinutes());
        return s;
    }

    private static Map<String, Long> count(List<Device> all, Function<Device, String> key) {
        return all.stream().collect(Collectors.groupingBy(key, TreeMap::new, Collectors.counting()));
    }

    private static String or(String v) {
        return v == null || v.isBlank() ? "Khác" : v.trim();
    }

    private static String pick(String v, String old) {
        return v == null || v.isBlank() ? old : v.trim();
    }
}
