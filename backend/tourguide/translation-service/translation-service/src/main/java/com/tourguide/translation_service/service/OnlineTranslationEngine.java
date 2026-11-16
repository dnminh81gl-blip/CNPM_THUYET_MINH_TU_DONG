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
import org.springframework.beans.factory.annotation.Value;
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
    private final String email;

    public OnlineTranslationEngine(@Value("${translation.mymemory.email:}") String email) {
        this(email, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build());
    }

    public OnlineTranslationEngine() {
        this("");
    }

    public OnlineTranslationEngine(String email, HttpClient httpClient) {
        this.email = email != null ? email.trim() : "";
        this.httpClient = httpClient;
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
            String url = buildUrl(text, sourceLang, targetLang, this.email);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(4))
                    .header("User-Agent", "TourGuide-Microservices/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                String translatedText = extractTranslatedText(response.body());
                if (isProviderWarning(translatedText)) {
                    // MyMemory van tra HTTP 200 khi het han muc / cau qua dai -> coi nhu loi de dung fallback
                    log.warn("[OnlineTranslationEngine] MyMemory canh bao: {}", translatedText);
                } else if (translatedText != null && !translatedText.isBlank()) {
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

    /**
     * Tao URL goi MyMemory. Ca q va langpair deu phai ma hoa: dau "|" trong "vi|en" de nguyen
     * se lam URI.create bao loi "Illegal character in query" -> truoc day luon roi xuong tu dien offline.
     * Co them tham so de=<email> de tang han muc len 50.000 ky tu/ngay (de trong thi khong them).
     */
    static String buildUrl(String text, String sourceLang, String targetLang) {
        return buildUrl(text, sourceLang, targetLang, null);
    }

    static String buildUrl(String text, String sourceLang, String targetLang, String email) {
        String encodedQuery = URLEncoder.encode(text, StandardCharsets.UTF_8);
        String langPair = URLEncoder.encode(sourceLang.toLowerCase() + "|" + targetLang.toLowerCase(),
                StandardCharsets.UTF_8);
        StringBuilder sb = new StringBuilder(API_ENDPOINT)
                .append("?q=").append(encodedQuery)
                .append("&langpair=").append(langPair);
        if (email != null && !email.isBlank()) {
            sb.append("&de=").append(URLEncoder.encode(email.trim(), StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    /** MyMemory tra canh bao ngay trong translatedText (vd "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS..."). */
    static boolean isProviderWarning(String translatedText) {
        if (translatedText == null) {
            return false;
        }
        String upper = translatedText.toUpperCase();
        return upper.startsWith("MYMEMORY WARNING")
                || upper.contains("QUERY LENGTH LIMIT EXCEEDED")
                || upper.startsWith("INVALID LANGUAGE PAIR");
    }

    static String extractTranslatedText(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return null;
        }
        Matcher matcher = TRANSLATED_TEXT_PATTERN.matcher(responseBody);
        if (matcher.find()) {
            return unescapeJson(matcher.group(1));
        }
        return null;
    }

    /** Giai ma chuoi JSON, ke ca dang \\uXXXX (chu Trung/tieng Viet co the bi ma hoa nhu vay). */
    static String unescapeJson(String raw) {
        StringBuilder out = new StringBuilder(raw.length());
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c != '\\' || i + 1 >= raw.length()) {
                out.append(c);
                continue;
            }
            char n = raw.charAt(++i);
            switch (n) {
                case 'n' -> out.append('\n');
                case 'r' -> out.append('\r');
                case 't' -> out.append('\t');
                case 'b' -> out.append('\b');
                case 'f' -> out.append('\f');
                case 'u' -> {
                    if (i + 4 < raw.length()) {
                        out.append((char) Integer.parseInt(raw.substring(i + 1, i + 5), 16));
                        i += 4;
                    } else {
                        out.append("\\u");
                    }
                }
                default -> out.append(n); // \" \\ \/
            }
        }
        return out.toString();
    }

    @Override
    public String getEngineName() {
        return "mymemory_online";
    }
}
