package com.tourguide.content_service;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

/**
 * Ảnh chụp toàn bộ số liệu thiết bị và lượt nghe, để ghi xuống đĩa và đọc lại khi content-service khởi động lại.
 * listens: nhật ký lượt nghe, mới nhất ở đầu.
 */
public record DeviceSnapshot(
        List<Device> devices,
        Map<Long, Integer> listensByPoi,
        Map<Long, Integer> scansByPoi,
        List<ListenRecord> listens
) implements Serializable {
}
