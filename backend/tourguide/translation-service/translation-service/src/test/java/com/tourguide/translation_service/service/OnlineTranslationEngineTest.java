package com.tourguide.translation_service.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;

import org.junit.jupiter.api.Test;

/** Chi kiem tra phan doc ket qua, KHONG goi mang. */
class OnlineTranslationEngineTest {

    @Test
    void decodesUnicodeEscapesAndQuotes() {
        String body = "{\"responseData\":{\"translatedText\":\"\\u6b22\\u8fce \\\"Saigon\\\"\",\"match\":1}}";
        assertEquals("欢迎 \"Saigon\"", OnlineTranslationEngine.extractTranslatedText(body));
    }

    @Test
    void plainUtf8IsKept() {
        String body = "{\"responseData\":{\"translatedText\":\"欢迎来到西贡歌剧院。\"}}";
        assertEquals("欢迎来到西贡歌剧院。", OnlineTranslationEngine.extractTranslatedText(body));
    }

    @Test
    void detectsMyMemoryQuotaWarning() {
        assertTrue(OnlineTranslationEngine.isProviderWarning(
                "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY."));
        assertTrue(OnlineTranslationEngine.isProviderWarning("QUERY LENGTH LIMIT EXCEEDED. MAX ALLOWED QUERY : 500 CHARS"));
        assertFalse(OnlineTranslationEngine.isProviderWarning("Welcome to Saigon."));
        assertFalse(OnlineTranslationEngine.isProviderWarning(null));
    }

    @Test
    void urlIsValidForVietnameseTextAndLangPair() {
        String url = OnlineTranslationEngine.buildUrl("Chào mừng bạn đến với Nhà hát Thành phố.", "vi", "EN");
        URI uri = URI.create(url);                      // truoc day nem IllegalArgumentException o dau "|"
        assertTrue(url.endsWith("&langpair=vi%7Cen"));
        assertEquals("api.mymemory.translated.net", uri.getHost());
        assertTrue(uri.getQuery().startsWith("q=Chào+mừng"));
    }
}
