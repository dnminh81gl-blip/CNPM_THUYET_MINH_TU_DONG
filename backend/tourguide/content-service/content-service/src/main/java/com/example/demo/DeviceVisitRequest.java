package com.example.demo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Web gửi lên mỗi khi một thiết bị mở trang (quét QR hoặc mở link).
 * KHÔNG có thông tin cá nhân: deviceId là mã ngẫu nhiên do trình duyệt tự tạo, không lưu IP.
 *
 * @param deviceId mã ngẫu nhiên của thiết bị (lưu trong trình duyệt)
 * @param os       iOS / Android / Windows / macOS / Linux / Khác
 * @param browser  Safari / Chrome / Zalo / Facebook / ...
 * @param type     Điện thoại / Máy tính bảng / Máy tính
 * @param lang     ngôn ngữ đang chọn: vi / en / zh
 * @param src      "qr" (quét mã QR) hoặc "web" (mở link thường)
 * @param poiId    POI của mã QR vừa quét (null nếu là QR chung của khu tham quan)
 */
public record DeviceVisitRequest(
        @NotBlank @Size(max = 64) String deviceId,
        @Size(max = 30) String os,
        @Size(max = 30) String browser,
        @Size(max = 30) String type,
        @Size(max = 10) String lang,
        @Size(max = 10) String src,
        Long poiId
) {
}
