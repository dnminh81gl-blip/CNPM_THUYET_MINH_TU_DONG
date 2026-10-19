package com.tourguide.tts_service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class TranslationEventsListenerTest {

    private final EventPublisher publisher = mock(EventPublisher.class);
    private final TranslationEventsListener listener = new TranslationEventsListener(publisher, new AudioService());

    private static TranslationCompletedEvent event(String id, Map<String, String> scripts) {
        return new TranslationCompletedEvent(id, "narr-1", 3L, 1, List.of("vi", "en", "zh"), "2026-10-19T06:00:00Z", scripts);
    }

    private AudioReadyEvent published() {
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(publisher).publish(eq(RabbitConfig.RK_AUDIO_READY), captor.capture());
        return (AudioReadyEvent) captor.getValue();
    }

    @Test
    void publishesAudioReadyWithOneAudioPerLanguage() {
        listener.onTranslationCompleted(event("tr-1", null));
        AudioReadyEvent ready = published();

        assertNotNull(ready.eventId());
        assertEquals("tr-1", ready.sourceEventId());   // truy vet nguoc ve translation.completed
        assertEquals(3L, ready.poiId());
        assertEquals(1, ready.version());
        assertEquals(3, ready.audios().size());
        assertEquals("vi-VN", ready.audios().get(0).voice());
        assertEquals("/audio/poi-3/v1/en.mp3", ready.audios().get(1).url());
        assertNull(ready.audios().get(0).text());       // chua co ban dich -> khong co van ban
        assertNotNull(ready.readyAt());
    }

    @Test
    void translatedTextIsAttachedToEachVoice() {
        listener.onTranslationCompleted(event("tr-9", Map.of(
                "vi", "Chào mừng bạn đến với Chợ Bến Thành.",
                "en", "Welcome to Ben Thanh Market.",
                "zh", "欢迎来到滨城市场。")));
        AudioReadyEvent ready = published();

        assertEquals("Chào mừng bạn đến với Chợ Bến Thành.", ready.audios().get(0).text());
        assertEquals("Welcome to Ben Thanh Market.", ready.audios().get(1).text());
        assertEquals("zh-CN", ready.audios().get(2).voice());
        assertEquals("欢迎来到滨城市场。", ready.audios().get(2).text());
    }

    @Test
    void sameEventTwiceIsProcessedOnlyOnce() {
        listener.onTranslationCompleted(event("tr-2", null));
        listener.onTranslationCompleted(event("tr-2", null));
        verify(publisher, times(1)).publish(anyString(), any());
    }

    @Test
    void invalidEventIsIgnored() {
        listener.onTranslationCompleted(null);
        listener.onTranslationCompleted(new TranslationCompletedEvent(null, null, 1L, 1, List.of("vi"), null, null));
        verify(publisher, never()).publish(anyString(), any());
    }

    @Test
    void audioServiceSkipsBlankAndDuplicateLanguages() {
        List<AudioItem> items = new AudioService().synthesize(5L, 2, List.of("VI", " vi ", "", "fr"), null);
        assertEquals(2, items.size());
        assertEquals("vi", items.get(0).lang());
        assertEquals("fr", items.get(1).voice());          // ngon ngu chua co giong mac dinh: dung chinh ma ngon ngu
        assertTrue(items.get(1).url().endsWith("/poi-5/v2/fr.mp3"));
    }

    @Test
    void languagesComeFromScriptsWhenLangsMissing() {
        List<AudioItem> items = new AudioService().synthesize(1L, 1, null, Map.of("en", "Hello"));
        assertEquals(1, items.size());
        assertEquals("Hello", items.get(0).text());
    }
}
