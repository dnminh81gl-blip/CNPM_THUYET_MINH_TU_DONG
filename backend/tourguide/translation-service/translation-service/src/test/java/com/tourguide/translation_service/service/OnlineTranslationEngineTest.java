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
        String url = OnlineTranslationEngine.buildUrl("Chào mừng bạn đến với Dinh Độc Lập.", "vi", "EN");
        URI uri = URI.create(url);                      // truoc day nem IllegalArgumentException o dau "|"
        assertTrue(url.contains("&langpair=vi%7Cen"));
        assertFalse(url.contains("&de="));
        assertEquals("api.mymemory.translated.net", uri.getHost());
        assertTrue(uri.getQuery().startsWith("q=Chào+mừng"));
    }

    @Test
    void urlIncludesEmailWhenProvided() {
        String url = OnlineTranslationEngine.buildUrl("Xin chào", "vi", "zh", "ngtrma0104@gmail.com");
        URI uri = URI.create(url);
        assertTrue(url.contains("&langpair=vi%7Czh"));
        assertTrue(url.contains("&de=ngtrma0104%40gmail.com"));
        assertEquals("api.mymemory.translated.net", uri.getHost());
    }

    @Test
    void urlHandlesZhCnLanguagePair() {
        String url = OnlineTranslationEngine.buildUrl("Dinh Độc Lập", "vi", "zh-CN", "team@example.com");
        URI uri = URI.create(url);
        assertTrue(url.contains("&langpair=vi%7Czh-cn"));
        assertTrue(url.contains("&de=team%40example.com"));
        assertEquals("api.mymemory.translated.net", uri.getHost());
    }

    @Test
    void urlOmitsEmailWhenBlankOrNull() {
        String urlNull = OnlineTranslationEngine.buildUrl("Xin chào", "vi", "en", null);
        assertFalse(urlNull.contains("&de="));

        String urlBlank = OnlineTranslationEngine.buildUrl("Xin chào", "vi", "en", "   ");
        assertFalse(urlBlank.contains("&de="));
    }
}
