package com.tourguide.tts_service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class AudioStatusControllerTest {

    @Test
    void countsProcessedEvents() {
        TranslationEventsListener listener = new TranslationEventsListener(mock(EventPublisher.class), new AudioService());
        AudioStatusController controller = new AudioStatusController(listener);
        assertEquals(0, controller.status().get("processedEvents"));

        listener.onTranslationCompleted(new TranslationCompletedEvent("t-1", "n-1", 3L, 1, List.of("vi", "en"),
                "2026-11-15T00:00:00Z", Map.of("vi", "Xin chao", "en", "Hello")));
        assertEquals(1, controller.status().get("processedEvents"));
        assertEquals(AudioService.ENGINE, controller.status().get("engine"));
    }
}
