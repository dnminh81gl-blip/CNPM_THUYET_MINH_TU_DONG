package com.tourguide.notification.listener;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class NotificationListenerTest {

    private final SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
    private final NotificationListener listener = new NotificationListener(template);

    private static Message msg(String body) {
        MessageProperties props = new MessageProperties();
        props.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        return new Message(body.getBytes(StandardCharsets.UTF_8), props);
    }

    @Test
    void translationCompleted_isForwardedToWebSocketWithType() {
        String json = "{\"eventId\":\"e1\",\"poiId\":3,\"version\":1,\"langs\":[\"vi\",\"en\",\"zh\"]}";
        listener.handleTranslationCompletedEvent(msg(json));
        verify(template).convertAndSend(NotificationListener.TOPIC,
                "{\"type\":\"translation.completed\",\"data\":" + json + "}");
    }

    @Test
    void audioReady_isForwardedToWebSocketWithType() {
        String json = "{\"eventId\":\"e2\",\"poiId\":5}";
        listener.handleAudioReadyEvent(msg(json));
        verify(template).convertAndSend(NotificationListener.TOPIC,
                "{\"type\":\"audio.ready\",\"data\":" + json + "}");
    }

    @Test
    void plainText_isQuotedSoPayloadStaysValidJson() {
        listener.handleAudioReadyEvent(msg("xin \"chao\""));
        verify(template).convertAndSend(NotificationListener.TOPIC,
                "{\"type\":\"audio.ready\",\"data\":\"xin \\\"chao\\\"\"}");
    }
}
