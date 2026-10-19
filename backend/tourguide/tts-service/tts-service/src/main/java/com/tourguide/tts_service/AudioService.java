package com.tourguide.tts_service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;

/**
 * Tao thong tin audio cho tung ngon ngu.
 * Ban PoC chua goi dich vu TTS that (Google/Azure...): tra ve ma giong doc, duong dan du kien va VAN BAN can doc;
 * Frontend dung ma giong + van ban de tu doc bang Web Speech API. Khi lam MVP chi can thay phan than ham synthesize().
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

    /**
     * @param langs   ngon ngu can tao audio; null -> lay theo cac ngon ngu co trong scripts
     * @param scripts ban dich theo ngon ngu (co the null khi translation-service chua gui)
     */
    public List<AudioItem> synthesize(long poiId, int version, List<String> langs, Map<String, String> scripts) {
        List<String> wanted = langs != null ? langs
                : scripts != null ? new ArrayList<>(scripts.keySet()) : List.of();
        return wanted.stream()
                .filter(l -> l != null && !l.isBlank())
                .map(l -> l.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .map(lang -> new AudioItem(
                        lang,
                        VOICES.getOrDefault(lang, lang),
                        "/audio/poi-" + poiId + "/v" + version + "/" + lang + ".mp3",
                        ENGINE,
                        textFor(scripts, lang)))
                .toList();
    }

    private static String textFor(Map<String, String> scripts, String lang) {
        if (scripts == null) return null;
        String t = scripts.get(lang);
        return t == null || t.isBlank() ? null : t;
    }
}
