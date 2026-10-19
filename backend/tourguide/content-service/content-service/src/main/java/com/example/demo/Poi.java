package com.example.demo;

/**
 * Một địa điểm tham quan (POI) do admin quản lý.
 * status: DRAFT = đã sửa nhưng chưa xuất bản, PUBLISHED = đã xuất bản (các service khác đã nhận nội dung).
 * version tăng mỗi khi nội dung bị sửa; xuất bản gửi đi đúng version hiện tại.
 */
public record Poi(
        long id,
        String name,
        String category,
        String address,
        double lat,
        double lng,
        int radius,       // bán kính kích hoạt geofence (mét)
        String text,      // nội dung giới thiệu gốc, tiếng Việt
        int version,
        String status,
        String updatedAt
) {
    public static final String DRAFT = "DRAFT";
    public static final String PUBLISHED = "PUBLISHED";
}
