package com.tourguide.translation_service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import com.tourguide.translation_service.model.TranslatedItem;
import com.tourguide.translation_service.service.TranslationManagerService;

class NarrationEventsListenerTest {

    private static final String VI = "Chào mừng bạn đến với Nhà hát Thành phố. Nhà hát khánh thành năm 1900.";

    private EventPublisher publisher;
    private TranslationManagerService translationManager;
    private NarrationEventsListener listener;

    @BeforeEach
    void setUp() {
        publisher = Mockito.mock(EventPublisher.class);
        translationManager = Mockito.mock(TranslationManagerService.class);
        listener = new NarrationEventsListener(publisher, translationManager);
    }

    private TranslationCompletedEvent published() {
        ArgumentCaptor<TranslationCompletedEvent> captor = ArgumentCaptor.forClass(TranslationCompletedEvent.class);
        verify(publisher, times(1)).publish(eq(RabbitConfig.RK_TRANSLATION_COMPLETED), captor.capture());
        return captor.getValue();
    }

    @Test
    void translatesRealScriptAndPublishesScripts() {
        NarrationCreatedEvent event = new NarrationCreatedEvent("evt-123", "source-001", 4L, 2,
                List.of("vi", "en", "zh"), "2026-10-19T12:00:00Z", Map.of("vi", VI));

        when(translationManager.processNarrationTranslation(4L, 2, List.of("vi", "en", "zh"), VI))
                .thenReturn(List.of(
                        TranslatedItem.of(4L, 2, "vi", VI, VI, "vi", "identity"),
                        TranslatedItem.of(4L, 2, "en", VI, "Welcome to the Saigon Opera House.", "vi", "test"),
                        TranslatedItem.of(4L, 2, "zh", VI, "欢迎来到西贡歌剧院。", "vi", "test")));

        listener.onNarrationCreated(event);

        TranslationCompletedEvent out = published();
        assertNotNull(out.eventId());
        assertEquals("evt-123", out.sourceEventId());
        assertEquals(4L, out.poiId());
        assertEquals(2, out.version());
        assertEquals(List.of("vi", "en", "zh"), out.langs());
        assertEquals(VI, out.scripts().get("vi"));
        assertEquals("Welcome to the Saigon Opera House.", out.scripts().get("en"));
        assertEquals("欢迎来到西贡歌剧院。", out.scripts().get("zh"));
    }

    @Test
    void eventWithoutScriptPassesNullSourceText() {
        NarrationCreatedEvent event = new NarrationCreatedEvent("evt-old", "source-002", 3L, 1,
                null, "2026-10-19T12:00:00Z", null);
        when(translationManager.processNarrationTranslation(eq(3L), eq(1), anyList(), isNull()))
                .thenReturn(List.of());

        listener.onNarrationCreated(event);

        verify(translationManager).processNarrationTranslation(eq(3L), eq(1), eq(List.of("vi", "en", "zh")), isNull());
        TranslationCompletedEvent out = published();
        assertEquals(List.of(), out.langs());
        assertNull(out.scripts());
    }

    @Test
    void sameEventTwiceIsProcessedOnlyOnce() {
        NarrationCreatedEvent event = new NarrationCreatedEvent("evt-duplicate", "source-001", 3L, 1,
                List.of("vi", "en"), "2026-10-17T12:00:00Z", Map.of("vi", VI));
        when(translationManager.processNarrationTranslation(anyLong(), anyInt(), anyList(), any()))
                .thenReturn(List.of(TranslatedItem.of(3L, 1, "vi", VI, VI, "vi", "identity")));

        listener.onNarrationCreated(event);
        listener.onNarrationCreated(event);

        verify(publisher, times(1)).publish(eq(RabbitConfig.RK_TRANSLATION_COMPLETED), Mockito.any());
    }

    @Test
    void invalidEventIsIgnored() {
        listener.onNarrationCreated(null);
        listener.onNarrationCreated(new NarrationCreatedEvent(null, null, 1L, 1, List.of("vi"), null, null));
        verify(publisher, never()).publish(Mockito.anyString(), Mockito.any());
    }
}
