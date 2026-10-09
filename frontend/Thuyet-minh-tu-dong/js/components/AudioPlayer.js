/* AudioPlayer: trình phát dưới bản đồ + trình phát nổi (hiện ở mọi tab) */
const PlayerUI = {
  init() {
    $("#pPlay").onclick = () => this.act("toggle");
    $("#npToggle").onclick = () => this.act("toggle");
    $("#pReplay").onclick = () => AudioService.replay();
    $("#pStop").onclick = () => AudioService.stop();
    $("#npStop").onclick = () => AudioService.stop();
    Bus.on("audio:state", s => this.state(s));
    Bus.on("audio:progress", ({ ratio, elapsed, total }) => {
      $("#pBar").style.width = ratio * 100 + "%";
      $("#pTime").textContent = total ? Helper.mmss(elapsed) + " / " + Helper.mmss(total) : "00:00";
    });
    Bus.on("lang:change", () => this.name());
  },
  act() { if (AudioService.current) AudioService.toggle(); else toast({ title: "Chưa chọn điểm", message: "Hãy bấm Nghe ở một địa điểm.", type: "warning" }); },
  name() { const p = AudioService.current; if (p) { const n = p.name[Settings.get().lang]; $("#pName").textContent = n; $("#npName").textContent = n; } },
  state({ state }) {
    const playing = state === "playing";
    $("#player").classList.toggle("playing", playing);
    $("#pPlay").innerHTML = `<i class="fas fa-${playing ? "pause" : "play"}"></i>`;
    $("#npToggle").innerHTML = `<i class="fas fa-${playing ? "pause" : "play"}"></i>`;
    $("#pStat").textContent = { playing: "Đang phát", paused: "Tạm dừng", idle: "Sẵn sàng" }[state];
    $("#nowPlaying").hidden = state === "idle";
    this.name();
  }
};
