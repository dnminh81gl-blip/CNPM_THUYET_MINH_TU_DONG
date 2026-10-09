package com.tourguide.narration_service;

import java.util.List;

/**
 * BẢN SAO riêng của sự kiện "content.published" phía NHẬN.
 * Hai service chỉ cần thống nhất về JSON (tên trường + kiểu dữ liệu), không dùng chung file Java.
 * Tên trường PHẢI khớp với bên gửi (xem EVENTS.md).
 */
public record ContentPublishedEvent(
        String eventId,
        long poiId,
        int version,
        List<String> langs,
        String publishedAt
) {
}
