package com.tourguide.translation_service.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

/**
 * Bộ dịch dự phòng ngoại tuyến (Offline Dictionary & Tourism Phrasebook).
 * Đảm bảo hệ thống luôn có bản dịch hoạt động tốt kể cả khi mất mạng hoặc không có API key.
 */
@Service
public class DictionaryFallbackEngine implements TranslationEngine {

    private final Map<String, Map<String, String>> phrasebook = new HashMap<>();

    public DictionaryFallbackEngine() {
        initPhrasebook();
    }

    private void initPhrasebook() {
        // Mẫu câu tiếng Việt -> Tiếng Anh
        Map<String, String> viToEn = new HashMap<>();
        viToEn.put("chào mừng", "welcome");
        viToEn.put("chùa một cột", "One Pillar Pagoda");
        viToEn.put("văn miếu", "Temple of Literature");
        viToEn.put("dinh độc lập", "Independence Palace");
        viToEn.put("nhà thờ đức bà", "Notre-Dame Cathedral");
        viToEn.put("phố cổ hội an", "Hoi An Ancient Town");
        viToEn.put("hồ hoàn kiếm", "Hoan Kiem Lake");
        viToEn.put("thuyết minh tự động", "automated audio narration");
        viToEn.put("di tích lịch sử", "historical relic");
        viToEn.put("kiến trúc", "architecture");
        viToEn.put("văn hóa", "culture");
        phrasebook.put("vi->en", viToEn);

        // Mẫu câu tiếng Việt -> Tiếng Trung
        Map<String, String> viToZh = new HashMap<>();
        viToZh.put("chào mừng", "欢迎");
        viToZh.put("chùa một cột", "一柱寺");
        viToZh.put("văn miếu", "文庙");
        viToZh.put("dinh độc lập", "统一宫");
        viToZh.put("nhà thờ đức bà", "红教堂");
        viToZh.put("phố cổ hội an", "会安古镇");
        viToZh.put("hồ hoàn kiếm", "还剑湖");
        viToZh.put("thuyết minh tự động", "自动语音解说");
        viToZh.put("di tích lịch sử", "历史遗迹");
        viToZh.put("kiến trúc", "建筑");
        viToZh.put("văn hóa", "文化");
        phrasebook.put("vi->zh", viToZh);
    }

    @Override
    public String translate(String text, String sourceLang, String targetLang) {
        if (text == null || text.isBlank()) {
            return "";
        }
        if (sourceLang.equalsIgnoreCase(targetLang)) {
            return text;
        }

        String pair = sourceLang.toLowerCase() + "->" + targetLang.toLowerCase();
        Map<String, String> dict = phrasebook.get(pair);

        String result = text;
        if (dict != null) {
            for (Map.Entry<String, String> entry : dict.entrySet()) {
                result = result.replaceAll("(?i)" + entry.getKey(), entry.getValue());
            }
        }

        // Nếu là tiếng Anh, gắn nhãn mô tả nếu chưa thay đổi nhiều
        if ("en".equalsIgnoreCase(targetLang)) {
            if (result.equals(text)) {
                return "[EN] " + text;
            }
            return result;
        }

        // Nếu là tiếng Trung
        if ("zh".equalsIgnoreCase(targetLang)) {
            if (result.equals(text)) {
                return "[ZH] " + text;
            }
            return result;
        }

        return "[" + targetLang.toUpperCase() + "] " + text;
    }

    @Override
    public String getEngineName() {
        return "offline_dictionary";
    }
}
