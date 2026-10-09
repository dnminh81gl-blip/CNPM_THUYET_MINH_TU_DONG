package com.tourguide.narration_service;

import java.util.List;

/** Su kien "narration.created" do narration-service PHAT ra (xem EVENTS.md). */
public record NarrationCreatedEvent(
        String eventId,
        String sourceEventId,
        long poiId,
        int version,
        List<String> langs,
        String createdAt
) {
}
