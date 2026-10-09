/* AudioService: phát thuyết minh. Hiện dùng Web Speech API (TTS của trình duyệt).
   Sau này: lấy audioUrl từ backend (GET /audio?poiId&lang) và phát bằng thẻ <audio>; Web Speech chỉ làm dự phòng. */
const AudioService = {
  state: "idle", // idle | playing | paused
  current: null,
  _tok: 0,
  supported: "speechSynthesis" in window,
  _set(s) { this.state = s; Bus.emit("audio:state", { state: s, poi: this.current }); },
  play(poi) {
    this.current = poi;
    if (!this.supported) { this._set("idle"); Bus.emit("audio:unsupported"); return; }
    const { lang, rate } = Settings.get();
    const text = poi.text[lang], id = ++this._tok;
    const total = POIService.duration(poi, lang, rate);
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGS[lang].tts; u.rate = rate;
    const vn = Store.get("voices", {})[lang];
    if (vn) { const vo = speechSynthesis.getVoices().find(x => x.name === vn); if (vo) u.voice = vo; }
    u.onboundary = e => { const r = e.charIndex / text.length; Bus.emit("audio:progress", { ratio: r, elapsed: r * total, total }); };
    const fin = () => { if (id !== this._tok) return; Bus.emit("audio:progress", { ratio: 0, elapsed: 0, total }); this._set("idle"); Bus.emit("audio:end", { poi }); };
    u.onend = fin; u.onerror = fin;
    Bus.emit("audio:progress", { ratio: 0, elapsed: 0, total });
    speechSynthesis.speak(u);
    this._set("playing");
    Bus.emit("audio:start", { poi, lang });
  },
  pause() { if (this.state === "playing") { speechSynthesis.pause(); this._set("paused"); } },
  resume() { if (this.state === "paused") { speechSynthesis.resume(); this._set("playing"); } },
  toggle() { if (this.state === "playing") this.pause(); else if (this.state === "paused") this.resume(); else if (this.current) this.play(this.current); },
  replay() { if (this.current) this.play(this.current); },
  stop() { this._tok++; if (this.supported) speechSynthesis.cancel(); Bus.emit("audio:progress", { ratio: 0, elapsed: 0, total: 0 }); this._set("idle"); },
  /* mở khoá âm thanh trên trình duyệt (cần một thao tác của người dùng) */
  unlock() { if (this.supported) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } }
};
