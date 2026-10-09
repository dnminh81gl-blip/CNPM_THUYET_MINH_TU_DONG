package com.tourguide.translation_service;

import java.util.List;

/** Su kien "translation.completed" do translation-service PHAT ra (xem EVENTS.md). */
public record TranslationCompletedEvent(
        String eventId,
        String sourceEventId,
        long poiId,
        int version,
        List<String> langs,
        String completedAt
) {
}
