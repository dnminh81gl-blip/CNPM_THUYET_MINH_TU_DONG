package com.tourguide.tts_service;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Kiem tra nhanh tts-service qua gateway: GET http://localhost:8080/api/audio/status
 * (route /api/audio/** cua api-gateway tro toi service nay).
 */
@RestController
public class AudioStatusController {

    private final TranslationEventsListener listener;

    public AudioStatusController(TranslationEventsListener listener) {
        this.listener = listener;
    }

    @GetMapping("/api/audio/status")
    public Map<String, Object> status() {
        return Map.of(
                "service", "tts-service",
                "status", "UP",
                "engine", AudioService.ENGINE,
                "listensTo", RabbitConfig.RK_TRANSLATION_COMPLETED,
                "publishes", RabbitConfig.RK_AUDIO_READY,
                "processedEvents", listener.processedCount());
    }
}
