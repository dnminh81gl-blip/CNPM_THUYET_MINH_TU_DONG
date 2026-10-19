package com.tourguide.tts_service;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;

/**
 * Tao thong tin audio cho tung ngon ngu.
 * Ban PoC chua goi dich vu TTS that (Google/Azure...): tra ve ma giong doc va duong dan du kien,
 * Frontend dung ma giong de tu doc bang Web Speech API. Khi lam MVP chi can thay phan than ham synthesize().
 */
@Service
public class AudioService {

    public static final String ENGINE = "client-speech";

    /** Ma giong doc cho tung ngon ngu (trung voi LANGS.tts o Frontend). */
    private static final Map<String, String> VOICES = Map.of(
            "vi", "vi-VN",
            "en", "en-US",
            "zh", "zh-CN"
    );

    public List<AudioItem> synthesize(long poiId, int version, List<String> langs) {
        if (langs == null) {
            return List.of();
        }
        return langs.stream()
                .filter(l -> l != null && !l.isBlank())
                .map(l -> l.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .map(lang -> new AudioItem(
                        lang,
                        VOICES.getOrDefault(lang, lang),
                        "/audio/poi-" + poiId + "/v" + version + "/" + lang + ".mp3",
                        ENGINE))
                .toList();
    }
}
