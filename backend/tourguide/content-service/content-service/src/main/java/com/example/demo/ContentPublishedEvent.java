package com.example.demo;

import java.util.List;

/**
 * SỰ KIỆN "content.published": nội dung của một địa điểm (POI) vừa được xuất bản.
 * Đây là một phần của "hợp đồng sự kiện" giữa các service (xem EVENTS.md).
 * Service nhận (narration-service) giữ một bản sao riêng của lớp này: hai bên chỉ thống nhất về JSON, không dùng chung code.
 */
public record ContentPublishedEvent(
        String eventId,       // mã duy nhất của sự kiện (dùng để chống xử lý trùng sau này)
        long poiId,           // địa điểm nào
        int version,          // phiên bản nội dung
        List<String> langs,   // các ngôn ngữ đã có nội dung, ví dụ ["vi","en","zh"]
        String publishedAt    // thời điểm xuất bản (ISO-8601)
) {
}
