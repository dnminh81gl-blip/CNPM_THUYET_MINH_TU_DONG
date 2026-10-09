package com.tourguide.translation_service;

import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Lang nghe narration.created -> (viec dich) -> phat translation.completed. */
@Component
public class NarrationEventsListener {

    private static final Logger log = LoggerFactory.getLogger(NarrationEventsListener.class);
    private final EventPublisher publisher;

    public NarrationEventsListener(EventPublisher publisher) {
        this.publisher = publisher;
    }

    @RabbitListener(queues = RabbitConfig.QUEUE_NARRATION_CREATED)
    public void onNarrationCreated(NarrationCreatedEvent event) {
        log.info("[translation-service] NHAN narration.created: poiId={}, version={}, langs={}, eventId={}",
                event.poiId(), event.version(), event.langs(), event.eventId());

        // TODO (Tram): goi dich vu dich that cho tung ngon ngu trong event.langs() o day.

        publisher.publish(RabbitConfig.RK_TRANSLATION_COMPLETED, new TranslationCompletedEvent(
                UUID.randomUUID().toString(), event.eventId(), event.poiId(), event.version(),
                event.langs(), Instant.now().toString()));
    }
}
