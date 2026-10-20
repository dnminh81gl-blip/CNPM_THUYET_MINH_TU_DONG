package com.example.demo;

/**
 * Một thiết bị đã truy cập khu tham quan (ẩn danh).
 * firstSeen / lastSeen là thời điểm ISO-8601; visits = số lần mở trang; listens = số lần nghe thuyết minh;
 * lastPoiId = điểm nghe gần nhất (null nếu chưa nghe). Thiết bị gửi tín hiệu (ping) mỗi 30 giây khi đang mở web.
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
        int listens,
        Long lastPoiId
) {
}
