package com.tourguide.narration_service;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Kiem tra nhanh narration-service qua gateway: GET http://localhost:8080/api/narrations/status
 * (route /api/narrations/** cua api-gateway tro toi service nay).
 */
@RestController
public class NarrationStatusController {

    private final ContentEventsListener listener;

    public NarrationStatusController(ContentEventsListener listener) {
        this.listener = listener;
    }

    @GetMapping("/api/narrations/status")
    public Map<String, Object> status() {
        return Map.of(
                "service", "narration-service",
                "status", "UP",
                "listensTo", RabbitConfig.RK_CONTENT_PUBLISHED,
                "publishes", RabbitConfig.RK_NARRATION_CREATED,
                "processedEvents", listener.processedCount());
    }
}
