package com.tourguide.translation_service.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import com.tourguide.translation_service.model.TranslatedItem;
import com.tourguide.translation_service.model.TranslationResponse;

class TranslationManagerServiceTest {

    private static final String OPERA =
            "Chào mừng bạn đến với Nhà hát Thành phố. Nhà hát khánh thành năm 1900 theo phong cách Pháp.";

    private OnlineTranslationEngine onlineEngine;
    private DictionaryFallbackEngine fallbackEngine;
    private TranslationStorage storage;
    private TranslationManagerService managerService;

    @BeforeEach
    void setUp() {
        onlineEngine = Mockito.mock(OnlineTranslationEngine.class);
        when(onlineEngine.getEngineName()).thenReturn("mymemory_online");
        fallbackEngine = new DictionaryFallbackEngine();
        storage = new TranslationStorage();
        managerService = new TranslationManagerService(onlineEngine, fallbackEngine, storage);
    }

    private void offline() {
        when(onlineEngine.translate(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("Offline mode"));
    }

    @Test
    void testTranslateSingle_SameLanguage() {
        TranslationResponse response = managerService.translateSingle("Xin chào", "vi", "vi");
        assertTrue(response.success());
        assertEquals("Xin chào", response.translatedText());
        assertEquals("identity", response.engine());
    }

    @Test
    void testTranslateSingle_OnlineSuccess() {
        when(onlineEngine.translate("Xin chào", "vi", "en")).thenReturn("Hello");

        TranslationResponse response = managerService.translateSingle("Xin chào", "vi", "en");
        assertTrue(response.success());
        assertEquals("Hello", response.translatedText());
        assertEquals("mymemory_online", response.engine());
    }

    @Test
    void testTranslateSingle_OnlineFails_FallbackToDictionary() {
        offline();

        TranslationResponse response = managerService.translateSingle("chào mừng", "vi", "en");
        assertTrue(response.success());
        assertEquals("welcome", response.translatedText());
        assertEquals("offline_dictionary", response.engine());
    }

    @Test
    void testTranslateEmptyText() {
        TranslationResponse response = managerService.translateSingle("", "vi", "en");
        assertFalse(response.success());
    }

    @Test
    void realScriptIsTranslatedAndRememberedAsOriginal() {
        offline();

        List<TranslatedItem> results = managerService.processNarrationTranslation(4L, 2, List.of("vi", "en", "zh"), OPERA);

        assertEquals(3, results.size());
        assertEquals(OPERA, storage.find(4L, 2, "vi").translatedText());
        // tu dien offline nhan ra ten dia diem THAT (khong con cau mau Nha tho Duc Ba)
        assertTrue(storage.find(4L, 2, "en").translatedText().contains("Saigon Opera House"));
        assertTrue(storage.find(4L, 2, "zh").translatedText().contains("西贡歌剧院"));
        assertEquals(OPERA, storage.find(4L, 2, "en").originalText());
        assertEquals(OPERA, storage.getOriginalNarration(4L));
    }

    @Test
    void withoutScriptUsesLastReceivedOriginal() {
        offline();
        managerService.processNarrationTranslation(4L, 1, List.of("vi"), OPERA);

        List<TranslatedItem> results = managerService.processNarrationTranslation(4L, 1, List.of("en"));
        assertEquals(1, results.size());
        assertEquals(OPERA, results.get(0).originalText());
    }

    @Test
    void unknownPoiWithoutScriptTranslatesNothing() {
        List<TranslatedItem> results = managerService.processNarrationTranslation(99L, 1, List.of("vi", "en"), null);
        assertTrue(results.isEmpty());
        verify(onlineEngine, never()).translate(anyString(), anyString(), anyString());
    }

    @Test
    void duplicateAndBlankLanguagesAreSkipped() {
        List<TranslatedItem> results = managerService.processNarrationTranslation(1L, 1, List.of("VI", " vi ", ""), OPERA);
        assertEquals(1, results.size());
        assertEquals("vi", results.get(0).lang());
    }

    @Test
    void longTextIsSentToOnlineEngineInChunksUnder450Bytes() {
        String sentence = "Dinh Độc Lập là công trình kiến trúc tiêu biểu của Sài Gòn với lịch sử hơn một thế kỷ. ";
        String longText = sentence.repeat(20).trim();          // ~2000 byte
        when(onlineEngine.translate(anyString(), eq("vi"), eq("en"))).thenReturn("part.");

        TranslationResponse response = managerService.translateSingle(longText, "vi", "en");

        ArgumentCaptor<String> chunks = ArgumentCaptor.forClass(String.class);
        verify(onlineEngine, Mockito.atLeast(4)).translate(chunks.capture(), eq("vi"), eq("en"));
        for (String chunk : chunks.getAllValues()) {
            assertTrue(chunk.getBytes(StandardCharsets.UTF_8).length <= 450, "doan qua dai: " + chunk.length());
        }
        assertEquals(String.join("", chunks.getAllValues()).replace(" ", ""), longText.replace(" ", ""));
        assertTrue(response.translatedText().startsWith("part. part."));
        assertEquals("mymemory_online", response.engine());
    }

    @Test
    void onlineFailureMidwaySwitchesRemainingChunksToDictionary() {
        String longText = ("Chào mừng bạn đến với Sài Gòn. ".repeat(30)).trim();
        when(onlineEngine.translate(anyString(), anyString(), anyString()))
                .thenReturn("Welcome to Saigon.")
                .thenThrow(new RuntimeException("quota"));

        TranslationResponse response = managerService.translateSingle(longText, "vi", "en");

        verify(onlineEngine, times(2)).translate(anyString(), anyString(), anyString()); // khong thu lai online nua
        assertEquals("mixed", response.engine());
        assertTrue(response.translatedText().contains("welcome to Saigon"));
    }

    @Test
    void toScriptsMapsLanguageToTranslation() {
        Map<String, String> scripts = TranslationManagerService.toScripts(List.of(
                TranslatedItem.of(1L, 1, "vi", "a", "a", "vi", "identity"),
                TranslatedItem.of(1L, 1, "en", "a", "b", "vi", "x"),
                TranslatedItem.of(1L, 1, "zh", "a", "  ", "vi", "x")));
        assertEquals(Map.of("vi", "a", "en", "b"), scripts);
        assertNotNull(TranslationManagerService.toScripts(null));
    }
}
