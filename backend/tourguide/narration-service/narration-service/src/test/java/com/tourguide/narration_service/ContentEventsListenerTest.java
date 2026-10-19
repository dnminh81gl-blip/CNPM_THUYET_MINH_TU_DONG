package com.tourguide.narration_service;

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

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ContentEventsListenerTest {

    private final EventPublisher publisher = mock(EventPublisher.class);
    private final ContentEventsListener listener = new ContentEventsListener(publisher, new NarrationComposer());

    private static ContentPublishedEvent event(String id, String name, String text) {
        return new ContentPublishedEvent(id, 6L, 1, List.of("vi", "en", "zh"), "2026-10-19T12:00:00Z", name, text);
    }

    private NarrationCreatedEvent published() {
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(publisher).publish(eq(RabbitConfig.RK_NARRATION_CREATED), captor.capture());
        return (NarrationCreatedEvent) captor.getValue();
    }

    @Test
    void composesScriptFromRealContent() {
        listener.onContentPublished(event("c-1", "Chợ Bến Thành", "Chợ được xây dựng năm 1914"));
        NarrationCreatedEvent n = published();

        assertEquals("c-1", n.sourceEventId());
        assertEquals(6L, n.poiId());
        assertNotNull(n.script());
        assertEquals("Chào mừng bạn đến với Chợ Bến Thành. Chợ được xây dựng năm 1914. "
                + NarrationComposer.CLOSING, n.script().get("vi"));
    }

    @Test
    void oldEventWithoutContentStillFlowsWithoutScript() {
        listener.onContentPublished(event("c-2", null, null));
        assertNull(published().script());
    }

    @Test
    void sameEventTwiceIsProcessedOnce() {
        listener.onContentPublished(event("c-3", "A", "B"));
        listener.onContentPublished(event("c-3", "A", "B"));
        verify(publisher, times(1)).publish(anyString(), any());
    }

    @Test
    void invalidEventIsIgnored() {
        listener.onContentPublished(null);
        verify(publisher, never()).publish(anyString(), any());
    }

    @Test
    void composerCleansWhitespaceAndKeepsPunctuation() {
        String s = new NarrationComposer().compose("  Nhà thờ  Đức Bà ", "Xây dựng\n từ năm 1863!");
        assertTrue(s.startsWith("Chào mừng bạn đến với Nhà thờ Đức Bà. Xây dựng từ năm 1863! "));
    }
}
