"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/channel/protocol.ts
  function createMessage(type, payload) {
    return { type, payload, timestamp: Date.now() };
  }
  var CHANNEL_NAME, HEARTBEAT_INTERVAL, SYNC_INTERVAL, HEARTBEAT_TIMEOUT;
  var init_protocol = __esm({
    "src/channel/protocol.ts"() {
      "use strict";
      CHANNEL_NAME = "mlmap-sync";
      HEARTBEAT_INTERVAL = 2e3;
      SYNC_INTERVAL = 500;
      HEARTBEAT_TIMEOUT = 6e3;
    }
  });

  // src/channel/index.ts
  var ChannelBridge;
  var init_channel = __esm({
    "src/channel/index.ts"() {
      "use strict";
      init_protocol();
      ChannelBridge = class {
        constructor(role) {
          this.listeners = /* @__PURE__ */ new Map();
          this.heartbeatTimer = null;
          this.lastPong = 0;
          this._connected = false;
          this.onConnectionChange = null;
          this.role = role;
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (e) => this.handleMessage(e.data);
          if (role === "control") {
            this.startHeartbeat();
          }
          if (role === "display") {
            this.on("PING", () => this.send("PONG"));
            setTimeout(() => this.send("DISPLAY_READY"), 100);
          }
        }
        get connected() {
          return this._connected;
        }
        set onConnectionChanged(cb) {
          this.onConnectionChange = cb;
        }
        send(type, payload) {
          try {
            this.channel.postMessage(createMessage(type, payload));
          } catch (e) {
            console.warn("ChannelBridge: Failed to send message", type, e);
          }
        }
        on(type, callback) {
          if (!this.listeners.has(type)) this.listeners.set(type, []);
          this.listeners.get(type).push(callback);
        }
        off(type, callback) {
          const cbs = this.listeners.get(type);
          if (cbs) {
            const idx = cbs.indexOf(callback);
            if (idx >= 0) cbs.splice(idx, 1);
          }
        }
        destroy() {
          if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
          this.channel.close();
          this.listeners.clear();
        }
        handleMessage(msg) {
          if (msg.type === "PONG" || msg.type === "DISPLAY_READY") {
            this.lastPong = Date.now();
            this.setConnected(true);
          }
          const cbs = this.listeners.get(msg.type);
          if (cbs) cbs.forEach((cb) => cb(msg.payload));
        }
        startHeartbeat() {
          this.heartbeatTimer = window.setInterval(() => {
            this.send("PING");
            if (this._connected && Date.now() - this.lastPong > HEARTBEAT_TIMEOUT) {
              this.setConnected(false);
            }
          }, HEARTBEAT_INTERVAL);
        }
        setConnected(val) {
          if (this._connected !== val) {
            this._connected = val;
            if (this.onConnectionChange) this.onConnectionChange(val);
          }
        }
      };
    }
  });

  // src/utils/basics.ts
  var solve;
  var init_basics = __esm({
    "src/utils/basics.ts"() {
      "use strict";
      solve = /* @__PURE__ */ (() => {
        function r(t, nArr, o, eFunc) {
          if (o === nArr.length - 1) return eFunc(t);
          let f;
          const u = nArr[o];
          const cArr = Array(u);
          for (f = u - 1; f >= 0; --f) cArr[f] = r(t[f], nArr, o + 1, eFunc);
          return cArr;
        }
        ;
        function tfn(rObj) {
          const res = [];
          while (typeof rObj === "object") {
            res.push(rObj.length);
            rObj = rObj[0];
          }
          return res;
        }
        ;
        function nfn(rObj) {
          let n, o;
          if (typeof rObj === "object") {
            n = rObj[0];
            if (typeof n === "object") {
              o = n[0];
              return typeof o === "object" ? tfn(rObj) : [rObj.length, n.length];
            }
            return [rObj.length];
          }
          return [];
        }
        ;
        function ofn(rArr) {
          let i;
          const n = rArr.length;
          const out = Array(n);
          for (i = n - 1; i >= 0; --i) out[i] = rArr[i];
          return out;
        }
        ;
        function efn(tVal) {
          return typeof tVal !== "object" ? tVal : r(tVal, nfn(tVal), 0, ofn);
        }
        ;
        function ffn(rArr, tFlag) {
          tFlag = tFlag || false;
          let n, o, fVar, uVar, a, h, i, l, g;
          let v = rArr.length;
          const y = v - 1;
          const b = new Array(v);
          if (!tFlag) rArr = efn(rArr);
          for (fVar = 0; fVar < v; ++fVar) {
            i = fVar;
            h = rArr[fVar];
            g = c(h[fVar]);
            for (o = fVar + 1; o < v; ++o) {
              uVar = c(rArr[o][fVar]);
              if (uVar > g) {
                g = uVar;
                i = o;
              }
            }
            b[fVar] = i;
            if (i != fVar) {
              rArr[fVar] = rArr[i];
              rArr[i] = h;
              h = rArr[fVar];
            }
            a = h[fVar];
            for (n = fVar + 1; n < v; ++n) rArr[n][fVar] /= a;
            for (n = fVar + 1; n < v; ++n) {
              l = rArr[n];
              for (o = fVar + 1; o < y; ++o) {
                l[o] -= l[fVar] * h[o];
                ++o;
                l[o] -= l[fVar] * h[o];
              }
              if (o === y) l[o] -= l[fVar] * h[o];
            }
          }
          return { LU: rArr, P: b };
        }
        ;
        function ufn(rObj, tArr) {
          let n, o, fVar, uVar, cVar;
          const a = rObj.LU;
          const h = a.length;
          const iArr = efn(tArr);
          const lArr = rObj.P;
          for (n = h - 1; n >= 0; --n) iArr[n] = tArr[n];
          for (n = 0; n < h; ++n) {
            fVar = lArr[n];
            if (lArr[n] !== n) {
              cVar = iArr[n];
              iArr[n] = iArr[fVar];
              iArr[fVar] = cVar;
            }
            uVar = a[n];
            for (o = 0; o < n; ++o) iArr[n] -= iArr[o] * uVar[o];
          }
          for (n = h - 1; n >= 0; --n) {
            uVar = a[n];
            for (o = n + 1; o < h; ++o) iArr[n] -= iArr[o] * uVar[o];
            iArr[n] /= uVar[n];
          }
          return iArr;
        }
        ;
        const c = Math.abs;
        return function(rMat, bVec, nOpt) {
          return ufn(ffn(rMat, nOpt), bVec);
        };
      })();
    }
  });

  // src/utils/transform.ts
  function computeTransformMatrix(sourcePoints, targetPoints) {
    const a = [];
    const b = [];
    for (let i = 0; i < sourcePoints.length; i++) {
      const s = sourcePoints[i];
      const t = targetPoints[i];
      a.push([s[0], s[1], 1, 0, 0, 0, -s[0] * t[0], -s[1] * t[0]]);
      b.push(t[0]);
      a.push([0, 0, 0, s[0], s[1], 1, -s[0] * t[1], -s[1] * t[1]]);
      b.push(t[1]);
    }
    const X = solve(a, b, true);
    return `matrix3d(${X[0]},${X[3]},0,${X[6]},${X[1]},${X[4]},0,${X[7]},0,0,1,0,${X[2]},${X[5]},0,1)`;
  }
  function applyTransform(element, sourcePoints, targetPoints) {
    element.style.transform = computeTransformMatrix(sourcePoints, targetPoints);
    element.style.transformOrigin = "0px 0px 0px";
  }
  var init_transform = __esm({
    "src/utils/transform.ts"() {
      "use strict";
      init_basics();
    }
  });

  // src/video/clipMaskRenderer.ts
  var ClipMaskRenderer;
  var init_clipMaskRenderer = __esm({
    "src/video/clipMaskRenderer.ts"() {
      "use strict";
      ClipMaskRenderer = class {
        constructor(getClipGroups) {
          this.running = false;
          this.rafId = 0;
          this.zoom = 1;
          this.getClipGroups = getClipGroups;
          this.canvas = document.createElement("canvas");
          this.canvas.style.position = "fixed";
          this.canvas.style.top = "0";
          this.canvas.style.left = "0";
          this.canvas.style.zIndex = "999999";
          this.canvas.style.pointerEvents = "none";
          this.ctx = this.canvas.getContext("2d");
          window.addEventListener("resize", () => this.resize());
          this.resize();
        }
        get canvasElement() {
          return this.canvas;
        }
        resize() {
          this.canvas.width = window.innerWidth;
          this.canvas.height = window.innerHeight;
        }
        start() {
          if (this.running) return;
          this.running = true;
          this.render();
        }
        stop() {
          this.running = false;
          if (this.rafId) cancelAnimationFrame(this.rafId);
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        render() {
          if (!this.running) return;
          const w = this.canvas.width;
          const h = this.canvas.height;
          this.ctx.clearRect(0, 0, w, h);
          const groups = this.getClipGroups();
          if (this.zoom !== 1) {
            this.ctx.save();
            const cx = w / 2;
            const cy = h / 2;
            this.ctx.translate(cx, cy);
            this.ctx.scale(this.zoom, this.zoom);
            this.ctx.translate(-cx, -cy);
          }
          for (const group of groups) {
            const video = group.video;
            if (video.readyState < 2) continue;
            const basePts = group.baseTargetPoints;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of basePts) {
              if (p[0] < minX) minX = p[0];
              if (p[1] < minY) minY = p[1];
              if (p[0] > maxX) maxX = p[0];
              if (p[1] > maxY) maxY = p[1];
            }
            const bw = maxX - minX;
            const bh = maxY - minY;
            if (bw <= 0 || bh <= 0) continue;
            for (const mask of group.masks) {
              const pts = mask.targetPoints;
              if (!pts || pts.length < 3) continue;
              this.ctx.save();
              this.ctx.beginPath();
              this.ctx.moveTo(pts[0][0], pts[0][1]);
              for (let i = 1; i < pts.length; i++) {
                this.ctx.lineTo(pts[i][0], pts[i][1]);
              }
              this.ctx.closePath();
              this.ctx.clip();
              this.ctx.drawImage(video, minX, minY, bw, bh);
              this.ctx.restore();
            }
          }
          if (this.zoom !== 1) {
            this.ctx.restore();
          }
          this.rafId = requestAnimationFrame(() => this.render());
        }
      };
    }
  });

  // src/display/renderer.ts
  var DisplayRenderer;
  var init_renderer = __esm({
    "src/display/renderer.ts"() {
      "use strict";
      init_channel();
      init_transform();
      init_protocol();
      init_clipMaskRenderer();
      DisplayRenderer = class {
        constructor() {
          this.layers = /* @__PURE__ */ new Map();
          this.layerInfos = /* @__PURE__ */ new Map();
          this.videoElements = /* @__PURE__ */ new Map();
          this.activeVideo = null;
          this.playlist = [];
          this.playlistIndex = 0;
          this.playlistLoop = true;
          this.currentName = null;
          this.layoutData = [];
          this.streamPCs = /* @__PURE__ */ new Map();
          this.bridge = new ChannelBridge("display");
          this.clipMaskRenderer = new ClipMaskRenderer(() => this.getClipGroups());
          document.body.appendChild(this.clipMaskRenderer.canvasElement);
          this.bindCommands();
          this.syncTimer = window.setInterval(() => {
            this.bridge.send("SYNC_RESPONSE", this.getState());
          }, SYNC_INTERVAL);
          const sendResize = () => {
            this.bridge.send("DISPLAY_RESIZE", { width: window.innerWidth, height: window.innerHeight });
          };
          window.addEventListener("resize", sendResize);
          document.addEventListener("fullscreenchange", sendResize);
        }
        getClipGroups() {
          const groups = [];
          const grouped = /* @__PURE__ */ new Map();
          for (const [id, info] of this.layerInfos) {
            if (!info.clipTo) continue;
            const baseVideo = this.videoElements.get(info.clipTo);
            if (!baseVideo) continue;
            const baseLayout = this.layoutData.find((l) => l.id === info.clipTo);
            const maskLayout = this.layoutData.find((l) => l.id === id);
            if (!baseLayout?.targetPoints || !maskLayout?.targetPoints) continue;
            if (!grouped.has(info.clipTo)) {
              grouped.set(info.clipTo, {
                video: baseVideo,
                baseTargetPoints: baseLayout.targetPoints,
                masks: []
              });
            }
            grouped.get(info.clipTo).masks.push({
              targetPoints: maskLayout.targetPoints
            });
          }
          for (const g of grouped.values()) groups.push(g);
          return groups;
        }
        updateClipMaskState() {
          const hiddenBases = /* @__PURE__ */ new Set();
          for (const [id, info] of this.layerInfos) {
            if (!info.clipTo) continue;
            const el = this.layers.get(id);
            if (el) el.style.opacity = "0";
            hiddenBases.add(info.clipTo);
          }
          for (const baseId of hiddenBases) {
            const el = this.layers.get(baseId);
            if (el) el.style.opacity = "0";
            const video = this.videoElements.get(baseId);
            if (video && video.paused && video.src && video.src !== window.location.href) {
              video.play().catch(() => {
              });
            }
          }
          if (hiddenBases.size > 0) this.clipMaskRenderer.start();
          else this.clipMaskRenderer.stop();
        }
        getState() {
          const v = this.activeVideo;
          return {
            playing: v ? !v.paused : false,
            currentTime: v?.currentTime || 0,
            duration: v?.duration || 0,
            volume: v?.volume || 1,
            muted: v?.muted ?? true,
            currentName: this.currentName,
            playlistIndex: this.playlistIndex,
            isFullscreen: !!document.fullscreenElement
          };
        }
        bindCommands() {
          this.bridge.on("ADD_LAYER", (p) => {
            if (this.layers.has(p.id)) {
              this.layerInfos.set(p.id, p);
              this.updateClipMaskState();
              return;
            }
            this.layerInfos.set(p.id, p);
            const el = this.createLayerElement(p);
            document.body.appendChild(el);
            this.layers.set(p.id, el);
            this.updateClipMaskState();
          });
          this.bridge.on("REMOVE_LAYER", (p) => {
            const pc = this.streamPCs.get(p.id);
            if (pc) {
              pc.close();
              this.streamPCs.delete(p.id);
            }
            const el = this.layers.get(p.id);
            if (el) {
              el.remove();
              this.layers.delete(p.id);
              this.layerInfos.delete(p.id);
              this.videoElements.delete(p.id);
            }
            this.updateClipMaskState();
          });
          this.bridge.on("UPDATE_LAYOUT", (p) => {
            if (!p.layout) return;
            this.layoutData = p.layout;
            for (const item of p.layout) {
              const el = this.layers.get(item.id);
              const info = this.layerInfos.get(item.id);
              if (info && info.clipTo) continue;
              if (el && item.sourcePoints && item.targetPoints) {
                applyTransform(el, item.sourcePoints, item.targetPoints);
              }
            }
            this.updateClipMaskState();
          });
          this.bridge.on("LOAD_PLAYLIST", (p) => {
            this.playlist = p.items || [];
            this.playlistLoop = p.loop ?? true;
            this.playlistIndex = p.startIndex || 0;
          });
          this.bridge.on("LOAD_VIDEO", (p) => {
            if (p.url && this.activeVideo) {
              this.currentName = p.name || null;
              this.activeVideo.src = p.url;
              this.activeVideo.load();
            }
          });
          this.bridge.on("PLAY", () => {
            if (this.activeVideo) {
              if ((!this.activeVideo.src || this.activeVideo.src === window.location.href) && this.playlist.length > 0) {
                this.loadCurrentItem();
              }
              this.activeVideo.play().catch(() => {
              });
            }
          });
          this.bridge.on("PAUSE", () => {
            if (this.activeVideo) this.activeVideo.pause();
          });
          this.bridge.on("STOP", () => {
            if (this.activeVideo) {
              this.activeVideo.pause();
              this.activeVideo.currentTime = 0;
            }
          });
          this.bridge.on("SEEK", (p) => {
            if (typeof p.time === "number") {
              if (this.activeVideo) this.activeVideo.currentTime = p.time;
            }
          });
          this.bridge.on("NEXT", () => this.next());
          this.bridge.on("PREVIOUS", () => this.previous());
          this.bridge.on("SET_VOLUME", (p) => {
            const vol = Math.max(0, Math.min(1, p.volume));
            if (this.activeVideo) this.activeVideo.volume = vol;
          });
          this.bridge.on("SET_MUTED", (p) => {
            if (typeof p.muted === "boolean") {
              if (this.activeVideo) this.activeVideo.muted = p.muted;
            }
          });
          this.bridge.on("FULLSCREEN_ENTER", () => {
            document.documentElement.requestFullscreen().catch(() => {
            });
          });
          this.bridge.on("FULLSCREEN_EXIT", () => {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {
            });
          });
          this.bridge.on("SEND_VIDEO_DATA", (p) => {
            const video = this.videoElements.get(p.layerId);
            if (!video) return;
            const blob = new Blob([p.data], { type: p.mimeType || "video/mp4" });
            const url = URL.createObjectURL(blob);
            video.src = url;
            video.load();
            this.updateClipMaskState();
          });
          this.bridge.on("RTC_OFFER", async (p) => {
            const oldPc = this.streamPCs.get(p.layerId);
            if (oldPc) oldPc.close();
            const pc = new RTCPeerConnection();
            this.streamPCs.set(p.layerId, pc);
            pc.ontrack = (e) => {
              const video = this.videoElements.get(p.layerId);
              if (video) {
                video.srcObject = e.streams[0] || new MediaStream([e.track]);
                video.autoplay = true;
                video.play().catch(() => {
                });
              }
              this.updateClipMaskState();
            };
            await pc.setRemoteDescription(p.sdp);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (pc.iceGatheringState !== "complete") {
              await new Promise((r) => {
                pc.addEventListener("icegatheringstatechange", () => {
                  if (pc.iceGatheringState === "complete") r();
                });
              });
            }
            this.bridge.send("RTC_ANSWER", { layerId: p.layerId, sdp: pc.localDescription.toJSON() });
          });
          this.bridge.on("INIT_STATE", (p) => {
            if (p.layers) {
              for (const layer of p.layers) {
                if (!this.layers.has(layer.id)) {
                  this.layerInfos.set(layer.id, layer);
                  const el = this.createLayerElement(layer);
                  document.body.appendChild(el);
                  this.layers.set(layer.id, el);
                }
              }
            }
            if (p.layout) {
              this.layoutData = p.layout;
              for (const item of p.layout) {
                const el = this.layers.get(item.id);
                const info = this.layerInfos.get(item.id);
                if (info && info.clipTo) continue;
                if (el && item.sourcePoints && item.targetPoints) {
                  applyTransform(el, item.sourcePoints, item.targetPoints);
                }
              }
            }
            if (p.playlist) {
              this.playlist = p.playlist.items || [];
              this.playlistLoop = p.playlist.loop ?? true;
              this.playlistIndex = p.playlist.startIndex || 0;
            }
            this.updateClipMaskState();
          });
        }
        createLayerElement(info) {
          const div = document.createElement("div");
          div.id = info.id;
          div.style.position = "fixed";
          div.style.top = "0px";
          div.style.left = "0px";
          div.style.width = info.width + "px";
          div.style.height = info.height + "px";
          div.style.overflow = "hidden";
          if (info.type === "video") {
            div.style.background = "#000";
            const video = document.createElement("video");
            if (info.videoUrl) video.src = info.videoUrl;
            video.style.width = "100%";
            video.style.height = "100%";
            video.style.objectFit = "contain";
            video.muted = true;
            video.playsInline = true;
            video.addEventListener("ended", () => this.onVideoEnded());
            div.appendChild(video);
            this.videoElements.set(info.id, video);
            this.activeVideo = video;
          } else if (info.type === "iframe" && info.iframeUrl) {
            div.style.background = "#000";
            const iframe = document.createElement("iframe");
            iframe.src = info.iframeUrl;
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.border = "none";
            iframe.style.pointerEvents = "none";
            iframe.setAttribute("allow", "autoplay; encrypted-media");
            div.appendChild(iframe);
          } else if (info.type === "shape") {
            if (info.shapeType === "circle") {
              div.style.background = "white";
              div.style.borderRadius = "50%";
            } else if (info.shapeType === "triangle") {
              div.style.width = "0";
              div.style.height = "0";
              div.style.borderLeft = info.width / 2 + "px solid transparent";
              div.style.borderRight = info.width / 2 + "px solid transparent";
              div.style.borderBottom = info.height + "px solid white";
              div.style.background = "transparent";
            } else {
              div.style.background = "white";
            }
          }
          return div;
        }
        loadCurrentItem() {
          if (!this.activeVideo || this.playlist.length === 0) return;
          const item = this.playlist[this.playlistIndex];
          if (!item) return;
          this.currentName = item.name;
          this.activeVideo.src = item.url;
          this.activeVideo.load();
        }
        next() {
          if (this.playlist.length === 0) return;
          this.playlistIndex++;
          if (this.playlistIndex >= this.playlist.length) {
            this.playlistIndex = this.playlistLoop ? 0 : this.playlist.length - 1;
            if (!this.playlistLoop) return;
          }
          this.loadCurrentItem();
          if (this.activeVideo) this.activeVideo.play().catch(() => {
          });
        }
        previous() {
          if (this.playlist.length === 0) return;
          this.playlistIndex--;
          if (this.playlistIndex < 0) {
            this.playlistIndex = this.playlistLoop ? this.playlist.length - 1 : 0;
            if (!this.playlistLoop) return;
          }
          this.loadCurrentItem();
          if (this.activeVideo) this.activeVideo.play().catch(() => {
          });
        }
        onVideoEnded() {
          if (this.playlist.length > 0) this.next();
        }
      };
    }
  });

  // src/display/index.ts
  var require_index = __commonJS({
    "src/display/index.ts"() {
      init_renderer();
      function init() {
        const overlay = document.getElementById("activate-overlay");
        if (overlay) {
          overlay.addEventListener("click", () => {
            overlay.classList.add("hidden");
            document.documentElement.requestFullscreen().catch(() => {
              console.log("MLMap Display: Fullscreen not available, continuing without it.");
            });
          });
          document.addEventListener("fullscreenchange", () => {
            if (!document.fullscreenElement && overlay.classList.contains("hidden")) {
              overlay.querySelector("span").textContent = "Click to re-enter fullscreen";
              overlay.classList.remove("hidden");
            }
          });
        }
        try {
          new DisplayRenderer();
          console.log("MLMap Display: Renderer initialized.");
        } catch (e) {
          console.error("MLMap Display: Failed to initialize renderer.", e);
        }
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
      } else {
        init();
      }
    }
  });
  require_index();
})();
//# sourceMappingURL=mlmap-display.js.map
