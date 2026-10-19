package com.tourguide.tts_service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class TranslationEventsListenerTest {

    private final EventPublisher publisher = mock(EventPublisher.class);
    private final TranslationEventsListener listener = new TranslationEventsListener(publisher, new AudioService());

    private static TranslationCompletedEvent event(String id) {
        return new TranslationCompletedEvent(id, "narr-1", 3L, 1, List.of("vi", "en", "zh"), "2026-10-19T06:00:00Z");
    }

    @Test
    void publishesAudioReadyWithOneAudioPerLanguage() {
        listener.onTranslationCompleted(event("tr-1"));

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(publisher).publish(org.mockito.ArgumentMatchers.eq(RabbitConfig.RK_AUDIO_READY), captor.capture());
        AudioReadyEvent ready = (AudioReadyEvent) captor.getValue();

        assertNotNull(ready.eventId());
        assertEquals("tr-1", ready.sourceEventId());   // truy vet nguoc ve translation.completed
        assertEquals(3L, ready.poiId());
        assertEquals(1, ready.version());
        assertEquals(3, ready.audios().size());
        assertEquals("vi-VN", ready.audios().get(0).voice());
        assertEquals("/audio/poi-3/v1/en.mp3", ready.audios().get(1).url());
        assertNotNull(ready.readyAt());
    }

    @Test
    void sameEventTwiceIsProcessedOnlyOnce() {
        listener.onTranslationCompleted(event("tr-2"));
        listener.onTranslationCompleted(event("tr-2"));
        verify(publisher, times(1)).publish(anyString(), any());
    }

    @Test
    void invalidEventIsIgnored() {
        listener.onTranslationCompleted(null);
        listener.onTranslationCompleted(new TranslationCompletedEvent(null, null, 1L, 1, List.of("vi"), null));
        verify(publisher, never()).publish(anyString(), any());
    }

    @Test
    void audioServiceSkipsBlankAndDuplicateLanguages() {
        List<AudioItem> items = new AudioService().synthesize(5L, 2, List.of("VI", " vi ", "", "fr"));
        assertEquals(2, items.size());
        assertEquals("vi", items.get(0).lang());
        assertEquals("fr", items.get(1).voice());          // ngon ngu chua co giong mac dinh: dung chinh ma ngon ngu
        assertTrue(items.get(1).url().endsWith("/poi-5/v2/fr.mp3"));
    }
}
