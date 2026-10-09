package com.tourguide.translation_service;

import java.util.List;

/**
 * Ban sao rieng cua su kien "narration.created" phia NHAN (xem EVENTS.md).
 * Ten truong PHAI khop voi ben gui (narration-service).
 */
public record NarrationCreatedEvent(
        String eventId,
        String sourceEventId,
        long poiId,
        int version,
        List<String> langs,
        String createdAt
) {
}
