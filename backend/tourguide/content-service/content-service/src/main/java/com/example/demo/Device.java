package com.example.demo;

/**
 * Một thiết bị đã truy cập khu tham quan (ẩn danh).
 * firstSeen / lastSeen là thời điểm ISO-8601; visits = số lần mở trang; listens = số lần nghe thuyết minh.
 */
public record Device(
        String deviceId,
        String os,
        String browser,
        String type,
        String lang,
        String firstSrc,
        String firstSeen,
        String lastSeen,
        int visits,
        int listens
) {
}
