/* NotificationService: nhận THÔNG BÁO THỜI GIAN THỰC từ notification-service (T10–T11).
   - Kết nối WebSocket tới api-gateway: <địa chỉ backend>/ws-notification/websocket (STOMP, kênh /topic/notifications).
     Địa chỉ backend lấy từ DeviceService.apiBase() (localhost / mạng LAN / tên miền ngrok cố định).
   - Dùng một client STOMP tối giản viết sẵn ở đây (không cần thư viện ngoài).
   - Mỗi thông báo có dạng {"type": "translation.completed" | "audio.ready", "data": {...sự kiện...}}
     và được phát lại trong trang qua Bus: "notify:message"; trạng thái kết nối: "notify:state" (true/false).
   - Mất kết nối thì tự kết nối lại (chờ 2, 4, 8... tối đa 30 giây). */
const NotificationService = {
  ws: null, connected: false, retry: 0, _t: null, started: false,
  TOPIC: "/topic/notifications",
  url() {
    const b = (typeof DeviceService !== "undefined") ? DeviceService.apiBase() : "";
    return b ? b.replace(/^http/i, "ws") + "/ws-notification/websocket" : "";
  },
  start() {
    if (this.started) return; this.started = true;
    this.connect();
    /* điện thoại khoá màn hình làm rớt kết nối: mở lại trang thì kết nối ngay */
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !this.connected) { this.retry = 0; this.connect(); } });
  },
  connect() {
    clearTimeout(this._t);
    const u = this.url(); if (!u || !("WebSocket" in window)) return;
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    let ws; try { ws = new WebSocket(u); } catch (e) { this.later(); return; }
    this.ws = ws;
    ws.onopen = () => ws.send("CONNECT\naccept-version:1.2,1.1\nheart-beat:0,0\nhost:/\n\n\u0000");
    ws.onmessage = e => String(e.data).split("\u0000").forEach(f => this.frame(f));
    ws.onclose = () => { if (this.ws !== ws) return; const was = this.connected; this.connected = false; if (was) Bus.emit("notify:state", false); this.later(); };
    ws.onerror = () => {};
  },
  later() { clearTimeout(this._t); const d = Math.min(30000, 2000 * Math.pow(2, this.retry++)); this._t = setTimeout(() => this.connect(), d); },
  /* một khung STOMP: LỆNH \n header:giá trị ... \n\n nội dung */
  frame(f) {
    f = f.replace(/^[\r\n]+/, ""); if (!f) return;
    const i = f.indexOf("\n\n"), cmd = (i < 0 ? f : f.slice(0, i)).split("\n")[0].trim(), body = i < 0 ? "" : f.slice(i + 2);
    if (cmd === "CONNECTED") {
      this.connected = true; this.retry = 0;
      this.ws.send(`SUBSCRIBE\nid:sub-0\ndestination:${this.TOPIC}\nack:auto\n\n\u0000`);
      Bus.emit("notify:state", true);
    } else if (cmd === "MESSAGE") {
      let m = body;
      for (let k = 0; k < 2 && typeof m === "string"; k++) { try { m = JSON.parse(m); } catch (e) { return; } }
      if (m && m.type) Bus.emit("notify:message", m);
    }
  }
};
