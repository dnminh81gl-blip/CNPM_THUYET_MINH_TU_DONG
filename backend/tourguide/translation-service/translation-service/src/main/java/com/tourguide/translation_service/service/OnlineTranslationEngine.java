package com.tourguide.translation_service.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Bộ dịch trực tuyến sử dụng MyMemory Translation API công cộng (miễn phí, không cần API key).
 * Sử dụng thuần Java standard library để không phụ thuộc thêm thư viện ngoài.
 * Tự động timeout sau 3 giây để không làm nghẽn hàng đợi xử lý sự kiện.
 */
@Service
public class OnlineTranslationEngine implements TranslationEngine {

    private static final Logger log = LoggerFactory.getLogger(OnlineTranslationEngine.class);
    private static final String API_ENDPOINT = "https://api.mymemory.translated.net/get";
    private static final Pattern TRANSLATED_TEXT_PATTERN =
            Pattern.compile("\"translatedText\"\\s*:\\s*\"(.*?)(?<!\\\\)\"");

    private final HttpClient httpClient;

    public OnlineTranslationEngine() {
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
                String translatedText = extractTranslatedText(response.body());
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

    private String extractTranslatedText(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return null;
        }
        Matcher matcher = TRANSLATED_TEXT_PATTERN.matcher(responseBody);
        if (matcher.find()) {
            String rawText = matcher.group(1);
            return rawText.replace("\\\"", "\"")
                          .replace("\\\\", "\\")
                          .replace("\\n", "\n")
                          .replace("\\r", "\r")
                          .replace("\\t", "\t");
        }
        return null;
    }

    @Override
    public String getEngineName() {
        return "mymemory_online";
    }
}
