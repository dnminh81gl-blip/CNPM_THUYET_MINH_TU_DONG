package com.tourguide.tts_service;

import java.util.List;

/** Su kien "audio.ready" do tts-service PHAT ra (xem EVENTS.md). */
public record AudioReadyEvent(
        String eventId,
        String sourceEventId,
        long poiId,
        int version,
        List<AudioItem> audios,
        String readyAt
) {
}
