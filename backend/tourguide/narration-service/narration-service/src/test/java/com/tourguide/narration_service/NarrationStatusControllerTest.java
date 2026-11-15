package com.tourguide.narration_service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import java.util.List;

import org.junit.jupiter.api.Test;

class NarrationStatusControllerTest {

    @Test
    void countsProcessedEvents() {
        ContentEventsListener listener = new ContentEventsListener(mock(EventPublisher.class), new NarrationComposer());
        NarrationStatusController controller = new NarrationStatusController(listener);
        assertEquals(0, controller.status().get("processedEvents"));

        listener.onContentPublished(new ContentPublishedEvent("e-1", 3L, 1, List.of("vi"), "2026-11-15T00:00:00Z", "Phong", "Noi dung"));
        listener.onContentPublished(new ContentPublishedEvent("e-1", 3L, 1, List.of("vi"), "2026-11-15T00:00:00Z", "Phong", "Noi dung"));
        assertEquals(1, controller.status().get("processedEvents"));
        assertEquals("UP", controller.status().get("status"));
    }
}
