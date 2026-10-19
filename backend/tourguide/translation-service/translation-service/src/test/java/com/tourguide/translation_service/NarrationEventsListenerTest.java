package com.tourguide.translation_service;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mockito;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.tourguide.translation_service.model.TranslatedItem;
import com.tourguide.translation_service.service.TranslationManagerService;

class NarrationEventsListenerTest {

    private EventPublisher publisher;
    private TranslationManagerService translationManager;
    private NarrationEventsListener listener;

    @BeforeEach
    void setUp() {
        publisher = Mockito.mock(EventPublisher.class);
        translationManager = Mockito.mock(TranslationManagerService.class);
        listener = new NarrationEventsListener(publisher, translationManager);
    }

    @Test
    void testOnNarrationCreated_Success() {
        NarrationCreatedEvent event = new NarrationCreatedEvent(
                "evt-123",
                "source-001",
                3L,
                1,
                List.of("vi", "en", "zh"),
                "2026-10-17T12:00:00Z"
        );

        when(translationManager.processNarrationTranslation(3L, 1, List.of("vi", "en", "zh")))
                .thenReturn(List.of(
                        TranslatedItem.of(3L, 1, "vi", "gốc", "gốc", "vi", "identity"),
                        TranslatedItem.of(3L, 1, "en", "gốc", "translated", "vi", "test"),
                        TranslatedItem.of(3L, 1, "zh", "gốc", "translated_zh", "vi", "test")
                ));

        listener.onNarrationCreated(event);

        ArgumentCaptor<TranslationCompletedEvent> captor = ArgumentCaptor.forClass(TranslationCompletedEvent.class);
        verify(publisher, times(1)).publish(eq(RabbitConfig.RK_TRANSLATION_COMPLETED), captor.capture());

        TranslationCompletedEvent published = captor.getValue();
        assertNotNull(published.eventId());
        assertEquals("evt-123", published.sourceEventId());
        assertEquals(3L, published.poiId());
        assertEquals(1, published.version());
        assertEquals(List.of("vi", "en", "zh"), published.langs());
    }

    @Test
    void testOnNarrationCreated_Idempotency() {
        NarrationCreatedEvent event = new NarrationCreatedEvent(
                "evt-duplicate",
                "source-001",
                3L,
                1,
                List.of("vi", "en"),
                "2026-10-17T12:00:00Z"
        );

        when(translationManager.processNarrationTranslation(anyLong(), anyInt(), anyList()))
                .thenReturn(List.of(
                        TranslatedItem.of(3L, 1, "vi", "gốc", "gốc", "vi", "identity")
                ));

        // Gọi lần 1
        listener.onNarrationCreated(event);
        // Gọi lại cùng eventId lần 2
        listener.onNarrationCreated(event);

        // Chỉ được phát sự kiện 1 lần duy nhất
        verify(publisher, times(1)).publish(eq(RabbitConfig.RK_TRANSLATION_COMPLETED), Mockito.any());
    }
}
