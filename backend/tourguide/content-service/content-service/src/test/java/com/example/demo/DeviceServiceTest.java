package com.example.demo;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class DeviceServiceTest {

    private static DeviceVisitRequest visit(String id, String os, String src, Long poiId) {
        return new DeviceVisitRequest(id, os, "Safari", "Điện thoại", "en", src, poiId);
    }

    @Test
    void sameDeviceTwiceCountsOneDeviceTwoVisits() {
        DeviceService s = new DeviceService();
        s.recordVisit(visit("d1", "iOS", "qr", 1L));
        Device d = s.recordVisit(visit("d1", "iOS", "web", null));

        assertEquals(1, s.list().size());
        assertEquals(2, d.visits());
        assertEquals("qr", d.firstSrc());          // nguồn đầu tiên được giữ lại
    }

    @Test
    void statsGroupByOsAndCountQrScansAndListensPerPoi() {
        DeviceService s = new DeviceService();
        s.recordVisit(visit("d1", "iOS", "qr", 3L));
        s.recordVisit(visit("d2", "Android", "qr", 3L));
        s.recordVisit(visit("d3", "Android", "web", null));
        s.recordListen(new DeviceListenRequest("d1", 3L, "en"));
        s.recordListen(new DeviceListenRequest("d2", 3L, "zh"));
        s.recordListen(new DeviceListenRequest("d2", 5L, "zh"));

        Map<String, Object> st = s.stats();
        assertEquals(3, st.get("totalDevices"));
        assertEquals(2L, st.get("qrDevices"));
        assertEquals(3, st.get("totalListens"));
        assertEquals(Map.of("Android", 2L, "iOS", 1L), st.get("byOs"));
        assertEquals(Map.of(3L, 2, 5L, 1), st.get("listensByPoi"));
        assertEquals(Map.of(3L, 2), st.get("scansByPoi"));
        assertEquals(Map.of("en", 2L, "zh", 1L), st.get("byLang"));   // d2 đổi sang tiếng Trung khi nghe
    }

    @Test
    void blankFieldsBecomeKhacAndListenFromUnknownDeviceCreatesIt() {
        DeviceService s = new DeviceService();
        Device d = s.recordVisit(new DeviceVisitRequest("x", " ", null, "", null, null, null));
        assertEquals("Khác", d.os());
        assertEquals("web", d.firstSrc());

        Device n = s.recordListen(new DeviceListenRequest("new", 2L, "vi"));
        assertEquals(1, n.listens());
        assertEquals(2, s.list().size());
    }

    /** Đồng hồ chỉnh tay được, để thử "đang dùng" (15 phút gần nhất) và "hôm nay" (giờ Việt Nam). */
    static final class TestClock extends Clock {
        Instant now;
        TestClock(String iso) { now = Instant.parse(iso); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    @Test
    void activeMeansSeenInLast15MinutesAndTodayUsesVietnamTime() {
        TestClock clock = new TestClock("2026-10-19T16:30:00Z");     // 23:30 ngày 19/10 giờ Việt Nam
        DeviceService s = new DeviceService(clock);
        s.recordVisit(visit("yesterday", "iOS", "qr", null));

        clock.now = Instant.parse("2026-10-20T07:00:00Z");           // 14:00 ngày 20/10 giờ Việt Nam
        s.recordVisit(visit("old", "iOS", "qr", null));
        clock.now = Instant.parse("2026-10-20T07:30:00Z");
        s.recordVisit(visit("new", "Android", "qr", null));

        Map<String, Object> st = s.stats();
        assertEquals(1L, st.get("activeDevices"));                    // chỉ "new" trong 15 phút gần nhất
        assertEquals(2L, st.get("todayDevices"));                     // "yesterday" là ngày hôm trước theo giờ VN
        assertEquals(List.of("new", "old", "yesterday"), s.list().stream().map(Device::deviceId).toList());
    }
}
