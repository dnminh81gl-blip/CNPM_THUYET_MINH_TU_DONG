package com.tourguide.content_service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Khởi động lại content-service không được làm mất thiết bị và lượt nghe. */
class DevicePersistenceTest {

    @TempDir
    Path dir;

    @Test
    void devicesAndListensSurviveRestart() {
        DeviceService before = new DeviceService();
        before.recordVisit(new DeviceVisitRequest("d1", "iOS", "Safari", "Điện thoại", "en", "qr", 3L));
        before.recordListen(new DeviceListenRequest("d1", 3L, "en"));
        before.recordListen(new DeviceListenRequest("d2", 5L, "zh"));
        new DevicePersistence(before, dir.toString()).saveIfChanged();

        // "khởi động lại": service mới, đọc lại từ file
        DeviceService after = new DeviceService();
        assertTrue(new DevicePersistence(after, dir.toString()).load());

        assertEquals(2, after.list().size());
        assertEquals(2, after.listens().size());
        assertEquals("d2", after.listens().get(0).deviceId());          // thứ tự mới nhất trước vẫn giữ
        Map<String, Object> st = after.stats();
        assertEquals(2, st.get("totalListens"));
        assertEquals(Map.of(3L, 1, 5L, 1), st.get("listensByPoi"));
        assertEquals(Map.of(3L, 1), st.get("scansByPoi"));
        assertEquals(1L, st.get("qrDevices"));
    }

    @Test
    void writesOnlyWhenSomethingChanged() throws Exception {
        DeviceService s = new DeviceService();
        DevicePersistence p = new DevicePersistence(s, dir.toString());
        p.saveIfChanged();
        assertFalse(Files.exists(dir.resolve(DevicePersistence.FILE_NAME)));   // chưa có gì thì không ghi

        s.recordListen(new DeviceListenRequest("d1", 1L, "vi"));
        p.saveIfChanged();
        long firstWrite = Files.getLastModifiedTime(dir.resolve(DevicePersistence.FILE_NAME)).toMillis();
        Thread.sleep(20);
        p.saveIfChanged();                                                  // không đổi gì -> không ghi lại
        assertEquals(firstWrite, Files.getLastModifiedTime(dir.resolve(DevicePersistence.FILE_NAME)).toMillis());
    }

    @Test
    void brokenFileStartsEmptyInsteadOfCrashing() throws Exception {
        Files.writeString(dir.resolve(DevicePersistence.FILE_NAME), "không phải dữ liệu");
        DeviceService s = new DeviceService();
        assertFalse(new DevicePersistence(s, dir.toString()).load());
        assertEquals(0, s.list().size());
    }
}
