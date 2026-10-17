package com.tourguide.translation_service.service;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.Mockito;
import static org.mockito.Mockito.when;

import com.tourguide.translation_service.model.TranslatedItem;
import com.tourguide.translation_service.model.TranslationResponse;

class TranslationManagerServiceTest {

    private OnlineTranslationEngine onlineEngine;
    private DictionaryFallbackEngine fallbackEngine;
    private TranslationStorage storage;
    private TranslationManagerService managerService;

    @BeforeEach
    void setUp() {
        onlineEngine = Mockito.mock(OnlineTranslationEngine.class);
        fallbackEngine = new DictionaryFallbackEngine();
        storage = new TranslationStorage();
        managerService = new TranslationManagerService(onlineEngine, fallbackEngine, storage);
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
        when(onlineEngine.getEngineName()).thenReturn("mymemory_online");

        TranslationResponse response = managerService.translateSingle("Xin chào", "vi", "en");
        assertTrue(response.success());
        assertEquals("Hello", response.translatedText());
        assertEquals("mymemory_online", response.engine());
    }

    @Test
    void testTranslateSingle_OnlineFails_FallbackToDictionary() {
        when(onlineEngine.translate(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("Network timeout"));

        TranslationResponse response = managerService.translateSingle("chào mừng", "vi", "en");
        assertTrue(response.success());
        assertEquals("welcome", response.translatedText());
        assertEquals("offline_dictionary", response.engine());
    }

    @Test
    void testProcessNarrationTranslation() {
        when(onlineEngine.translate(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("Offline mode"));

        List<TranslatedItem> results = managerService.processNarrationTranslation(3L, 1, List.of("vi", "en", "zh"));
        assertNotNull(results);
        assertEquals(3, results.size());

        TranslatedItem viItem = storage.find(3L, 1, "vi");
        assertNotNull(viItem);
        assertEquals("vi", viItem.lang());

        TranslatedItem enItem = storage.find(3L, 1, "en");
        assertNotNull(enItem);
        assertEquals("en", enItem.lang());

        TranslatedItem zhItem = storage.find(3L, 1, "zh");
        assertNotNull(zhItem);
        assertEquals("zh", zhItem.lang());
    }

    @Test
    void testTranslateEmptyText() {
        TranslationResponse response = managerService.translateSingle("", "vi", "en");
        assertFalse(response.success());
    }
}
