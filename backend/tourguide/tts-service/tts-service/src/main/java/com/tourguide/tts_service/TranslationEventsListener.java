package com.tourguide.tts_service;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Lang nghe translation.completed -> tao audio cho tung ngon ngu (kem van ban da dich) -> phat audio.ready. */
@Component
public class TranslationEventsListener {

    private static final Logger log = LoggerFactory.getLogger(TranslationEventsListener.class);

    private final EventPublisher publisher;
    private final AudioService audioService;
    /* chong xu ly trung theo eventId (RabbitMQ co the giao lai mot tin) */
    private final Set<String> processedEventIds = ConcurrentHashMap.newKeySet();

    public TranslationEventsListener(EventPublisher publisher, AudioService audioService) {
        this.publisher = publisher;
        this.audioService = audioService;
    }

    @RabbitListener(queues = RabbitConfig.QUEUE_TRANSLATION_COMPLETED)
    public void onTranslationCompleted(TranslationCompletedEvent event) {
        if (event == null || event.eventId() == null) {
            log.warn("[tts-service] Bo qua su kien khong hop le");
            return;
        }
        if (!processedEventIds.add(event.eventId())) {
            log.warn("[tts-service] Su kien eventId={} da xu ly truoc do, bo qua", event.eventId());
            return;
        }

        log.info("[tts-service] NHAN translation.completed: poiId={}, version={}, langs={}, coBanDich={}, eventId={}",
                event.poiId(), event.version(), event.langs(), event.scripts() != null, event.eventId());

        List<AudioItem> audios = audioService.synthesize(event.poiId(), event.version(), event.langs(), event.scripts());

        publisher.publish(RabbitConfig.RK_AUDIO_READY, new AudioReadyEvent(
                UUID.randomUUID().toString(), event.eventId(), event.poiId(), event.version(),
                audios, Instant.now().toString()));
    }
}
