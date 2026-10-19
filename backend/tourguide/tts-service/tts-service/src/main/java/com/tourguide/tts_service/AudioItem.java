package com.tourguide.tts_service;

/**
 * Thong tin audio cua MOT ngon ngu.
 * @param lang    ma ngon ngu: vi / en / zh
 * @param voice   ma giong doc (BCP-47) de Frontend chon giong, vd "vi-VN"
 * @param url     duong dan file audio (ban PoC: duong dan du kien, chua sinh file that)
 * @param engine  cach tao audio: "client-speech" = Frontend tu doc bang Web Speech API cua trinh duyet
 * @param text    MOI: van ban can doc (ban dich tu translation.completed); null neu chua co ban dich
 */
public record AudioItem(String lang, String voice, String url, String engine, String text) {
}
