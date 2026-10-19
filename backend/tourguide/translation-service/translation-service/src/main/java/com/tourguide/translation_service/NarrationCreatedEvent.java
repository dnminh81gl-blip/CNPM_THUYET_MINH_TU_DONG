package com.tourguide.translation_service;

import java.util.List;
import java.util.Map;

/**
 * Ban sao rieng cua su kien "narration.created" phia NHAN (xem EVENTS.md).
 * Ten truong PHAI khop voi ben gui (narration-service).
 *
 * @param script MOI: bai thuyet minh theo ngon ngu, narration-service gui ban goc {"vi": "..."}.
 *               Co the null neu ben gui la phien ban cu.
 */
public record NarrationCreatedEvent(
        String eventId,
        String sourceEventId,
        long poiId,
        int version,
        List<String> langs,
        String createdAt,
        Map<String, String> script
) {
    /** Ban goc tieng Viet (null neu khong co). */
    public String sourceText() {
        if (script == null) return null;
        String vi = script.get("vi");
        return vi == null || vi.isBlank() ? null : vi;
    }
}
