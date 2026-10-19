package com.tourguide.narration_service;

import java.util.List;
import java.util.Map;

/** Su kien "narration.created" do narration-service PHAT ra (xem EVENTS.md). */
public record NarrationCreatedEvent(
        String eventId,
        String sourceEventId,
        long poiId,
        int version,
        List<String> langs,
        String createdAt,
        Map<String, String> script   // MOI: bai thuyet minh goc {"vi": "..."}; null neu khong co noi dung
) {
}
