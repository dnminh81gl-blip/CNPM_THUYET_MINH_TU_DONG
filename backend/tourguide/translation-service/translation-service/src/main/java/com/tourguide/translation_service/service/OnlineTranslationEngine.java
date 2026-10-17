package com.tourguide.translation_service.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Bộ dịch trực tuyến sử dụng MyMemory Translation API công cộng (miễn phí, không cần API key).
 * Tự động timeout sau 3 giây để không làm nghẽn hàng đợi xử lý sự kiện.
 */
@Service
public class OnlineTranslationEngine implements TranslationEngine {

    private static final Logger log = LoggerFactory.getLogger(OnlineTranslationEngine.class);
    private static final String API_ENDPOINT = "https://api.mymemory.translated.net/get";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public OnlineTranslationEngine(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    @Override
    public String translate(String text, String sourceLang, String targetLang) {
        if (text == null || text.isBlank()) {
            return "";
        }
        if (sourceLang.equalsIgnoreCase(targetLang)) {
            return text;
        }

        try {
            String encodedQuery = URLEncoder.encode(text, StandardCharsets.UTF_8);
            String langPair = sourceLang.toLowerCase() + "|" + targetLang.toLowerCase();
            String url = String.format("%s?q=%s&langpair=%s", API_ENDPOINT, encodedQuery, langPair);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(4))
                    .header("User-Agent", "TourGuide-Microservices/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode responseData = root.path("responseData");
                String translatedText = responseData.path("translatedText").asText();
                if (translatedText != null && !translatedText.isBlank()) {
                    return translatedText;
                }
            } else {
                log.warn("[OnlineTranslationEngine] API trả về mã lỗi HTTP {}", response.statusCode());
            }
        } catch (Exception e) {
            log.warn("[OnlineTranslationEngine] Không thể gọi API dịch online: {}", e.getMessage());
        }

        throw new RuntimeException("Online translation service unavailable");
    }

    @Override
    public String getEngineName() {
        return "mymemory_online";
    }
}
