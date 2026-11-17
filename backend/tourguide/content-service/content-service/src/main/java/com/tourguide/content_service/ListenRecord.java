package com.tourguide.content_service;

/**
 * Một lượt nghe thuyết minh (ẩn danh): thiết bị nào nghe POI nào, bằng ngôn ngữ nào, lúc nào (ISO-8601).
 * Trang Admin "Lịch sử & thống kê" dùng danh sách này để vẽ lượt nghe theo ngày, theo điểm, theo ngôn ngữ.
 */
public record ListenRecord(String deviceId, Long poiId, String lang, String at) {
}
