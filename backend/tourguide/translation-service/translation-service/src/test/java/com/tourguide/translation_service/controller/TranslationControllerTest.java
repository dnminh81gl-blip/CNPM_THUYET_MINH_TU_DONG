package com.tourguide.translation_service.controller;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mockito;
import static org.mockito.Mockito.when;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.tourguide.translation_service.EventPublisher;
import com.tourguide.translation_service.model.TranslatedItem;
import com.tourguide.translation_service.model.TranslationResponse;
import com.tourguide.translation_service.service.TranslationManagerService;
import com.tourguide.translation_service.service.TranslationStorage;

class TranslationControllerTest {

    private MockMvc mockMvc;
    private TranslationManagerService translationManager;
    private EventPublisher publisher;
    private TranslationStorage storage;

    @BeforeEach
    void setUp() {
        translationManager = Mockito.mock(TranslationManagerService.class);
        publisher = Mockito.mock(EventPublisher.class);
        storage = new TranslationStorage();

        when(translationManager.getStorage()).thenReturn(storage);

        TranslationController controller = new TranslationController(translationManager, publisher);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testGetStatus() throws Exception {
        mockMvc.perform(get("/api/translations/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.service").value("translation-service"))
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void testTranslateText_Success() throws Exception {
        when(translationManager.translateSingle("Xin chào", "vi", "en"))
                .thenReturn(TranslationResponse.success("Xin chào", "Hello", "vi", "en", "mock_engine"));

        String json = "{\"text\":\"Xin chào\",\"sourceLang\":\"vi\",\"targetLang\":\"en\"}";

        mockMvc.perform(post("/api/translations/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.translatedText").value("Hello"));
    }

    @Test
    void testTranslateText_EmptyBadRequest() throws Exception {
        String json = "{\"text\":\"\",\"sourceLang\":\"vi\",\"targetLang\":\"en\"}";

        mockMvc.perform(post("/api/translations/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testGetTranslationsByPoi() throws Exception {
        storage.save(TranslatedItem.of(3L, 1, "vi", "Gốc", "Gốc", "vi", "identity"));
        storage.save(TranslatedItem.of(3L, 1, "en", "Gốc", "English text", "vi", "mock"));

        mockMvc.perform(get("/api/translations?poiId=3&version=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void testTestTranslateEndpoint() throws Exception {
        when(translationManager.processNarrationTranslation(eq(3L), eq(1), any()))
                .thenReturn(List.of(
                        TranslatedItem.of(3L, 1, "vi", "Gốc", "Gốc", "vi", "identity"),
                        TranslatedItem.of(3L, 1, "en", "Gốc", "Welcome", "vi", "mock")
                ));

        mockMvc.perform(get("/api/test/translate?poiId=3&version=1&langs=vi,en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.translations.length()").value(2));
    }
}
