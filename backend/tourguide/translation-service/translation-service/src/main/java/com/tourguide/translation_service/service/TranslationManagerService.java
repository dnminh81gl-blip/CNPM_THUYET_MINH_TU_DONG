package com.tourguide.translation_service.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.tourguide.translation_service.model.TranslatedItem;
import com.tourguide.translation_service.model.TranslationResponse;

/**
 * Service điều phối dịch thuật: ưu tiên dịch online (MyMemory), tự chuyển sang
 * từ điển offline nếu có sự cố mạng. Văn bản dài được cắt thành nhiều đoạn (TextChunker).
 */
@Service
public class TranslationManagerService {

    private static final Logger log = LoggerFactory.getLogger(TranslationManagerService.class);
    public static final String SOURCE_LANG = "vi";

    private final OnlineTranslationEngine onlineEngine;
    private final DictionaryFallbackEngine fallbackEngine;
    private final TranslationStorage storage;

    public TranslationManagerService(OnlineTranslationEngine onlineEngine,
                                     DictionaryFallbackEngine fallbackEngine,
                                     TranslationStorage storage) {
        this.onlineEngine = onlineEngine;
        this.fallbackEngine = fallbackEngine;
        this.storage = storage;
    }

    /**
     * Dịch một văn bản (dài bao nhiêu cũng được), tự động fallback an toàn.
     * Văn bản được cắt thành các đoạn <= 450 byte; nếu một đoạn dịch online lỗi thì các đoạn còn lại
     * dùng luôn từ điển offline để không phải chờ timeout nhiều lần.
     */
    public TranslationResponse translateSingle(String text, String sourceLang, String targetLang) {
        if (text == null || text.isBlank()) {
            return TranslationResponse.failure(text, sourceLang, targetLang, "Văn bản rỗng");
        }

        if (sourceLang.equalsIgnoreCase(targetLang)) {
            return TranslationResponse.success(text, text, sourceLang, targetLang, "identity");
        }

        List<String> chunks = TextChunker.split(text);
        List<String> translatedChunks = new ArrayList<>();
        Set<String> engines = new LinkedHashSet<>();
        boolean onlineAvailable = true;

        for (String chunk : chunks) {
            String translated = null;
            if (onlineAvailable) {
                try {
                    translated = onlineEngine.translate(chunk, sourceLang, targetLang);
                    if (translated != null && !translated.isBlank()) {
                        engines.add(onlineEngine.getEngineName());
                    } else {
                        translated = null;
                    }
                } catch (Exception e) {
                    onlineAvailable = false;
                    log.info("[translation-service] Dịch online không khả dụng ({}), chuyển sang fallback từ điển",
                            e.getMessage());
                }
            }
            if (translated == null) {
                translated = fallbackEngine.translate(chunk, sourceLang, targetLang);
                engines.add(fallbackEngine.getEngineName());
            }
            translatedChunks.add(translated.trim());
        }

        String separator = isCjk(targetLang) ? "" : " ";
        String joined = String.join(separator, translatedChunks);
        String engine = engines.size() == 1 ? engines.iterator().next() : "mixed";
        return TranslationResponse.success(text, joined, sourceLang, targetLang, engine);
    }

    /**
     * Dịch bài thuyết minh THẬT của một POI sang các ngôn ngữ.
     *
     * @param sourceText bản gốc tiếng Việt lấy từ sự kiện (script.vi). Nếu null thì dùng bản gốc
     *                   đã nhận gần nhất của POI này; nếu vẫn chưa có thì không dịch gì (trả về rỗng).
     */
    public List<TranslatedItem> processNarrationTranslation(long poiId, int version, List<String> targetLangs,
                                                            String sourceText) {
        String baseContent;
        if (sourceText != null && !sourceText.isBlank()) {
            baseContent = sourceText.trim();
            storage.setOriginalNarration(poiId, baseContent);
        } else {
            baseContent = storage.getOriginalNarration(poiId);
        }

        List<TranslatedItem> results = new ArrayList<>();
        if (baseContent == null) {
            log.warn("[translation-service] Chưa có nội dung gốc cho poiId={}, version={} -> bỏ qua dịch",
                    poiId, version);
            return results;
        }

        for (String lang : normalize(targetLangs)) {
            try {
                TranslationResponse response = translateSingle(baseContent, SOURCE_LANG, lang);
                TranslatedItem item = TranslatedItem.of(
                        poiId,
                        version,
                        lang,
                        baseContent,
                        response.translatedText(),
                        SOURCE_LANG,
                        response.engine()
                );
                storage.save(item);
                results.add(item);
                log.info("[translation-service] Đã dịch poiId={}, version={}, lang={}, engine={}",
                        poiId, version, lang, response.engine());
            } catch (Exception e) {
                log.error("[translation-service] Lỗi khi dịch poiId={} sang lang={}: {}", poiId, lang, e.getMessage());
            }
        }

        return results;
    }

    /** Dùng bản gốc đã lưu của POI (không có nội dung mới). */
    public List<TranslatedItem> processNarrationTranslation(long poiId, int version, List<String> targetLangs) {
        return processNarrationTranslation(poiId, version, targetLangs, null);
    }

    /** Gom kết quả thành map {lang: bản dịch} để gửi trong trường scripts của translation.completed. */
    public static Map<String, String> toScripts(List<TranslatedItem> items) {
        Map<String, String> scripts = new LinkedHashMap<>();
        if (items == null) {
            return scripts;
        }
        for (TranslatedItem item : items) {
            if (item.translatedText() != null && !item.translatedText().isBlank()) {
                scripts.put(item.lang(), item.translatedText());
            }
        }
        return scripts;
    }

    public TranslationStorage getStorage() {
        return storage;
    }

    private static List<String> normalize(List<String> langs) {
        if (langs == null) {
            return List.of();
        }
        return langs.stream()
                .filter(l -> l != null && !l.isBlank())
                .map(l -> l.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private static boolean isCjk(String lang) {
        String l = lang.toLowerCase(Locale.ROOT);
        return l.startsWith("zh") || l.startsWith("ja");
    }
}
