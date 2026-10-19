package com.tourguide.translation_service;

import java.util.List;
import java.util.Map;

/**
 * Su kien "translation.completed" do translation-service PHAT ra (xem EVENTS.md).
 *
 * @param scripts MOI: bai thuyet minh da dich, moi ngon ngu mot ban {"vi":"...","en":"...","zh":"..."}
 */
public record TranslationCompletedEvent(
        String eventId,
        String sourceEventId,
        long poiId,
        int version,
        List<String> langs,
        String completedAt,
        Map<String, String> scripts
) {
}
