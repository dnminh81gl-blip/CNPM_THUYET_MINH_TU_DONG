package com.tourguide.tts_service;

import java.util.List;
import java.util.Map;

/** Su kien "translation.completed" do translation-service phat ra (xem EVENTS.md). */
public record TranslationCompletedEvent(
        String eventId,
        String sourceEventId,
        long poiId,
        int version,
        List<String> langs,
        String completedAt,
        Map<String, String> scripts   // MOI: ban dich theo ngon ngu; null neu translation-service chua gui
) {
}
