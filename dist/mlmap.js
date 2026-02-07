"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/lib/data.ts
  var VERSION, historyStack, redoStack, historyLimit, DISPLAY_URL;
  var init_data = __esm({
    "src/lib/data.ts"() {
      "use strict";
      VERSION = "0.1.0.0";
      historyStack = [];
      redoStack = [];
      historyLimit = 50;
      DISPLAY_URL = "display.html";
    }
  });

  // src/utils/remote.ts
  async function checkLatestVersion() {
    const CACHE_KEY = "mlmap:cache:checkLatestVersion";
    const CACHE_DURATION = 5 * 60 * 1e3;
    const now = Date.now();
    const cachedString = localStorage.getItem(CACHE_KEY);
    let cachedData = null;
    if (cachedString) try {
      cachedData = JSON.parse(cachedString);
    } catch {
    }
    ;
    if (cachedData && now - cachedData.timestamp < CACHE_DURATION) return { current: VERSION, latest: cachedData.latest, requireUpdate: cachedData.latest !== VERSION };
    const controller = new AbortController();
    const timeout = 5e3;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch("https://raw.githubusercontent.com/FJRG2007/mlmap/refs/heads/main/package.json", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json();
      cachedData = { latest: data.version, timestamp: now };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
      return { current: VERSION, latest: data.version, requireUpdate: data.version !== VERSION };
    } catch {
      return { current: VERSION, latest: cachedData?.latest || VERSION, requireUpdate: false };
    }
    ;
  }
  var init_remote = __esm({
    "src/utils/remote.ts"() {
      "use strict";
      init_data();
    }
  });

  // src/events/listeners.ts
  var require_listeners = __commonJS({
    "src/events/listeners.ts"() {
      "use strict";
      init_remote();
      document.addEventListener("DOMContentLoaded", async () => {
        const versionInfo = await checkLatestVersion();
        console.log(`Current version: ${versionInfo.current}`);
        console.log(`Latest version: ${versionInfo.latest}`);
        if (versionInfo.requireUpdate) console.log("A new version is available!");
      });
    }
  });

  // src/events/index.ts
  var require_events = __commonJS({
    "src/events/index.ts"() {
      "use strict";
      var import_listeners = __toESM(require_listeners());
    }
  });

  // src/main.ts
  var import_events = __toESM(require_events());

  // src/utils/basics.ts
  function getFreePosition(width, height, layers = []) {
    let x = 0, y = 0, tries = 0, maxTries = 100;
    let overlap;
    do {
      overlap = false;
      x = Math.random() * (window.innerWidth - width);
      y = Math.random() * (window.innerHeight - height);
      for (let l of layers) {
        const rect = [
          Math.min(...l.targetPoints.map((p) => p[0])),
          Math.min(...l.targetPoints.map((p) => p[1])),
          Math.max(...l.targetPoints.map((p) => p[0])),
          Math.max(...l.targetPoints.map((p) => p[1]))
        ];
        if (!(x + width < rect[0] || x > rect[2] || y + height < rect[1] || y > rect[3])) {
          overlap = true;
          break;
        }
      }
      tries++;
    } while (overlap && tries < maxTries);
    return [x, y];
  }
  function clonePoints(points) {
    return points.map((p) => p.slice(0, 2));
  }
  function distanceTo(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }
  var solve = /* @__PURE__ */ (() => {
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

  // src/utils/storage.ts
  function saveWorkspace(workspace) {
    localStorage.setItem(`mlmap:workspace<${workspace.id}>`, JSON.stringify(workspace));
  }
  function loadWorkspace(workspaceId) {
    let currentWorkspaceId = localStorage.getItem("mlmap:currentWorkspaceId");
    if (!currentWorkspaceId) {
      currentWorkspaceId = Date.now().toString();
      localStorage.setItem("mlmap:currentWorkspaceId", currentWorkspaceId);
      const defaultWorkspace = {
        id: currentWorkspaceId,
        name: "New Workspace",
        version: "1.0",
        layout: {}
      };
      localStorage.setItem(`mlmap:workspace<${currentWorkspaceId}>`, JSON.stringify(defaultWorkspace));
      return defaultWorkspace;
    }
    const raw = localStorage.getItem(`mlmap:workspace<${workspaceId || currentWorkspaceId}>`);
    return raw ? JSON.parse(raw) : null;
  }
  function deleteWorkspace(workspaceId) {
    localStorage.removeItem(`mlmap:workspace<${workspaceId}>`);
  }
  function resetWorkspace(workspaceId) {
    const cacheKey = `mlmap:workspace<${workspaceId}>`;
    const currentData = JSON.parse(localStorage.getItem(cacheKey) || `{id:"${workspaceId}",name:"Reset Workspace",version:"1.0",layout:{}`);
    localStorage.setItem(cacheKey, JSON.stringify({
      id: workspaceId,
      name: currentData?.name,
      version: "1.0",
      layout: {}
    }));
  }
  function loadAllWorkspaces() {
    const workspaces = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("mlmap:workspace<")) {
        const raw = localStorage.getItem(key);
        if (raw) workspaces.push(JSON.parse(raw));
      }
    }
    return workspaces;
  }

  // src/uiControls/index.ts
  init_data();
  init_remote();

  // src/channel/protocol.ts
  var CHANNEL_NAME = "mlmap-sync";
  var HEARTBEAT_INTERVAL = 2e3;
  var HEARTBEAT_TIMEOUT = 6e3;
  function createMessage(type, payload) {
    return { type, payload, timestamp: Date.now() };
  }

  // src/channel/index.ts
  var ChannelBridge = class {
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

  // src/video/sources.ts
  var STORAGE_KEY = "mlmap:videoSources";
  var VideoSourceManager = class {
    constructor() {
      this.sources = [];
      this.onChange = null;
      this.liveStreams = /* @__PURE__ */ new Map();
      this.load();
    }
    set onChanged(cb) {
      this.onChange = cb;
    }
    getAll() {
      return [...this.sources];
    }
    getById(id) {
      return this.sources.find((s) => s.id === id);
    }
    getStream(sourceId) {
      return this.liveStreams.get(sourceId);
    }
    addUrl(url, name) {
      const fileName = name || url.split("/").pop() || "video";
      const source = {
        id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: fileName,
        url,
        type: "url"
      };
      this.sources.push(source);
      this.save();
      this.notify();
      return source;
    }
    addFile(file) {
      const blobUrl = URL.createObjectURL(file);
      const source = {
        id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        url: blobUrl,
        type: "file"
      };
      this.sources.push(source);
      this.notify();
      return source;
    }
    addCapture(stream, name) {
      const id = `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const source = {
        id,
        name,
        url: `capture:${id}`,
        type: "capture"
      };
      this.liveStreams.set(id, stream);
      this.sources.push(source);
      const tracks = stream.getTracks();
      const checkEnded = () => {
        if (tracks.every((t) => t.readyState === "ended")) {
          this.liveStreams.delete(id);
        }
      };
      tracks.forEach((t) => t.addEventListener("ended", checkEnded));
      this.notify();
      return source;
    }
    remove(id) {
      const idx = this.sources.findIndex((s) => s.id === id);
      if (idx >= 0) {
        const src = this.sources[idx];
        if (src.type === "file" && src.url.startsWith("blob:")) {
          URL.revokeObjectURL(src.url);
        }
        if (src.type === "capture") {
          const stream = this.liveStreams.get(id);
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
            this.liveStreams.delete(id);
          }
        }
        this.sources.splice(idx, 1);
        this.save();
        this.notify();
      }
    }
    save() {
      const persistable = this.sources.filter((s) => s.type === "url");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    }
    load() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) this.sources = JSON.parse(stored);
      } catch {
        this.sources = [];
      }
    }
    notify() {
      if (this.onChange) this.onChange();
    }
  };

  // src/video/playlist.ts
  var STORAGE_KEY2 = "mlmap:playlists";
  var ACTIVE_KEY = "mlmap:activePlaylist";
  var PlaylistManager = class {
    constructor() {
      this.playlists = [];
      this.activeId = null;
      this.onChange = null;
      this.load();
    }
    set onChanged(cb) {
      this.onChange = cb;
    }
    getAll() {
      return [...this.playlists];
    }
    getActive() {
      return this.playlists.find((p) => p.id === this.activeId) || this.playlists[0] || null;
    }
    setActive(id) {
      this.activeId = id;
      localStorage.setItem(ACTIVE_KEY, id);
      this.notify();
    }
    create(name) {
      const playlist = {
        id: `pl-${Date.now()}`,
        name,
        items: [],
        loop: true
      };
      this.playlists.push(playlist);
      if (!this.activeId) this.activeId = playlist.id;
      this.save();
      this.notify();
      return playlist;
    }
    remove(id) {
      this.playlists = this.playlists.filter((p) => p.id !== id);
      if (this.activeId === id) {
        this.activeId = this.playlists[0]?.id || null;
      }
      this.save();
      this.notify();
    }
    addItem(playlistId, sourceId) {
      const pl = this.playlists.find((p) => p.id === playlistId);
      if (!pl) return;
      const item = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceId,
        order: pl.items.length
      };
      pl.items.push(item);
      this.save();
      this.notify();
    }
    removeItem(playlistId, itemId) {
      const pl = this.playlists.find((p) => p.id === playlistId);
      if (!pl) return;
      pl.items = pl.items.filter((i) => i.id !== itemId);
      pl.items.forEach((item, idx) => item.order = idx);
      this.save();
      this.notify();
    }
    moveItem(playlistId, itemId, direction) {
      const pl = this.playlists.find((p) => p.id === playlistId);
      if (!pl) return;
      const idx = pl.items.findIndex((i) => i.id === itemId);
      if (idx < 0) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= pl.items.length) return;
      [pl.items[idx], pl.items[newIdx]] = [pl.items[newIdx], pl.items[idx]];
      pl.items.forEach((item, i) => item.order = i);
      this.save();
      this.notify();
    }
    toggleLoop(playlistId) {
      const pl = this.playlists.find((p) => p.id === playlistId);
      if (!pl) return;
      pl.loop = !pl.loop;
      this.save();
      this.notify();
    }
    save() {
      localStorage.setItem(STORAGE_KEY2, JSON.stringify(this.playlists));
      if (this.activeId) localStorage.setItem(ACTIVE_KEY, this.activeId);
    }
    load() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY2);
        if (stored) {
          this.playlists = JSON.parse(stored);
        } else {
          this.create("Default");
        }
        this.activeId = localStorage.getItem(ACTIVE_KEY) || this.playlists[0]?.id || null;
      } catch {
        this.create("Default");
      }
    }
    notify() {
      if (this.onChange) this.onChange();
    }
  };

  // src/uiControls/videoPanel.ts
  function formatTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  function initVideoUI(mediaContainer, transportContainer, bridge, onAddVideoLayer) {
    const sourceManager = new VideoSourceManager();
    const playlistManager = new PlaylistManager();
    let localVideo = null;
    let localPlaylistIndex = 0;
    mediaContainer.innerHTML = `
        <div class="mlmap-section">
            <div class="mlmap-section-title">Media Library</div>
            <div style="display:flex;gap:4px;margin-bottom:4px;">
                <input id="vp-url" type="text" class="mlmap-input" placeholder="Video URL..." style="flex:1;min-width:0;">
                <button id="vp-addUrl" class="mlmap-btn">Add</button>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:6px;">
                <input id="vp-file" type="file" accept="video/*" style="display:none;">
                <button id="vp-chooseFile" class="mlmap-btn" style="flex:1;">Browse file...</button>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:6px;">
                <button id="vp-capture" class="mlmap-btn" style="flex:1;">Screen capture...</button>
                <button id="vp-webcam" class="mlmap-btn" style="flex:1;">Webcam...</button>
            </div>
            <div id="vp-library"></div>
        </div>
        <div class="mlmap-section">
            <div class="mlmap-section-title">Playlist</div>
            <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px;">
                <select id="vp-plSelect" class="mlmap-select" style="flex:1;min-width:0;"></select>
                <button id="vp-plNew" class="mlmap-btn" title="New playlist">+</button>
                <button id="vp-plDel" class="mlmap-btn" title="Delete playlist">-</button>
            </div>
            <div id="vp-playlist" style="margin-bottom:4px;"></div>
            <button id="vp-loop" class="mlmap-btn" style="width:100%;font-size:10px;">Loop: ON</button>
        </div>
    `;
    transportContainer.innerHTML = `
        <div style="display:flex;align-items:center;gap:3px;">
            <button id="tp-prev" class="transport-btn" title="Previous">|&lt;</button>
            <button id="tp-rw" class="transport-btn" title="-10s">&lt;&lt;</button>
            <button id="tp-play" class="transport-btn" title="Play" style="width:38px;font-size:14px;">&#9654;</button>
            <button id="tp-ff" class="transport-btn" title="+10s">&gt;&gt;</button>
            <button id="tp-next" class="transport-btn" title="Next">&gt;|</button>
            <button id="tp-stop" class="transport-btn" title="Stop">&#9632;</button>
        </div>
        <input id="tp-seek" type="range" min="0" max="1000" value="0" step="1" class="mlmap-range" style="flex:1;min-width:80px;">
        <span id="tp-time" style="font-size:11px;white-space:nowrap;color:#aaa;min-width:85px;text-align:center;">0:00 / 0:00</span>
        <span id="tp-now" style="flex:1;font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">No media</span>
        <div style="display:flex;align-items:center;gap:4px;">
            <span style="font-size:10px;color:#666;">Vol</span>
            <input id="tp-vol" type="range" min="0" max="100" value="100" class="mlmap-range" style="width:70px;">
            <button id="tp-mute" class="transport-btn" style="width:28px;font-size:10px;" title="Mute/Unmute">M</button>
        </div>
        <select id="tp-audioOut" class="mlmap-select" style="max-width:120px;font-size:10px;" title="Audio output routing">
            <option value="editor">Audio: Editor</option>
            <option value="output">Audio: Output</option>
            <option value="both">Audio: Both</option>
        </select>
    `;
    const $ = (id) => document.getElementById(id);
    function registerVideoElement(video) {
      localVideo = video;
      video.addEventListener("timeupdate", updateTransportUI);
      video.addEventListener("play", () => {
        if (localVideo === video) applyAudioRouting();
        updateTransportUI();
      });
      video.addEventListener("pause", updateTransportUI);
      video.addEventListener("ended", onLocalVideoEnded);
      video.addEventListener("loadedmetadata", updateTransportUI);
    }
    function loadPlaylistItem(index) {
      const active = playlistManager.getActive();
      if (!active || !active.items[index] || !localVideo) return;
      localPlaylistIndex = index;
      const item = active.items[index];
      const src = sourceManager.getById(item.sourceId);
      if (!src) return;
      localVideo.src = src.url;
      localVideo.load();
    }
    function localNext() {
      const active = playlistManager.getActive();
      if (!active || active.items.length === 0) return;
      localPlaylistIndex++;
      if (localPlaylistIndex >= active.items.length) {
        if (active.loop) localPlaylistIndex = 0;
        else {
          localPlaylistIndex = active.items.length - 1;
          return;
        }
      }
      loadPlaylistItem(localPlaylistIndex);
      if (localVideo) localVideo.play().catch(() => {
      });
      bridge.send("NEXT");
    }
    function localPrev() {
      const active = playlistManager.getActive();
      if (!active || active.items.length === 0) return;
      localPlaylistIndex--;
      if (localPlaylistIndex < 0) {
        if (active.loop) localPlaylistIndex = active.items.length - 1;
        else {
          localPlaylistIndex = 0;
          return;
        }
      }
      loadPlaylistItem(localPlaylistIndex);
      if (localVideo) localVideo.play().catch(() => {
      });
      bridge.send("PREVIOUS");
    }
    function onLocalVideoEnded() {
      const active = playlistManager.getActive();
      if (active && active.items.length > 1) localNext();
      else if (active && active.loop && localVideo) {
        localVideo.currentTime = 0;
        localVideo.play().catch(() => {
        });
      }
    }
    function getCurrentSourceName() {
      const active = playlistManager.getActive();
      if (active && active.items[localPlaylistIndex]) {
        const src = sourceManager.getById(active.items[localPlaylistIndex].sourceId);
        if (src) return src.name;
      }
      if (localVideo && localVideo.src && localVideo.src !== window.location.href) {
        const parts = localVideo.src.split("/");
        return parts[parts.length - 1] || "Video";
      }
      return "";
    }
    $("vp-addUrl").addEventListener("click", () => {
      const input = $("vp-url");
      const url = input.value.trim();
      if (url) {
        sourceManager.addUrl(url);
        input.value = "";
        renderLibrary();
      }
    });
    $("vp-url").addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") $("vp-addUrl").click();
    });
    $("vp-chooseFile").addEventListener("click", () => $("vp-file").click());
    $("vp-file").addEventListener("change", (e) => {
      const input = e.target;
      if (input.files && input.files[0]) {
        sourceManager.addFile(input.files[0]);
        renderLibrary();
        input.value = "";
      }
    });
    $("vp-capture").addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const track = stream.getVideoTracks()[0];
        const label = track?.label || "Screen Capture";
        const src = sourceManager.addCapture(stream, label);
        renderLibrary();
        onAddVideoLayer(src.url, src.name, stream);
      } catch {
      }
    });
    $("vp-webcam").addEventListener("click", async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === "videoinput");
        let constraints = { video: true, audio: true };
        if (cameras.length > 1) {
          const options = cameras.map((c, i) => `${i + 1}. ${c.label || `Camera ${i + 1}`}`).join("\n");
          const choice = prompt(`Select camera:
${options}`, "1");
          if (!choice) return;
          const idx = parseInt(choice) - 1;
          if (idx >= 0 && idx < cameras.length) {
            constraints = { video: { deviceId: { exact: cameras[idx].deviceId } }, audio: true };
          }
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const track = stream.getVideoTracks()[0];
        const label = track?.label || "Webcam";
        const src = sourceManager.addCapture(stream, label);
        renderLibrary();
        onAddVideoLayer(src.url, src.name, stream);
      } catch {
      }
    });
    $("vp-plSelect").addEventListener("change", (e) => {
      playlistManager.setActive(e.target.value);
      renderPlaylist();
    });
    $("vp-plNew").addEventListener("click", () => {
      const name = prompt("Playlist name:", "New Playlist");
      if (name) {
        const pl = playlistManager.create(name);
        playlistManager.setActive(pl.id);
        renderPlaylistSelector();
        renderPlaylist();
      }
    });
    $("vp-plDel").addEventListener("click", () => {
      const active = playlistManager.getActive();
      if (active && playlistManager.getAll().length > 1) {
        playlistManager.remove(active.id);
        renderPlaylistSelector();
        renderPlaylist();
      }
    });
    $("vp-loop").addEventListener("click", () => {
      const active = playlistManager.getActive();
      if (active) {
        playlistManager.toggleLoop(active.id);
        renderPlaylist();
      }
    });
    const AUDIO_MODE_KEY = "mlmap:audioMode";
    let audioMode = localStorage.getItem(AUDIO_MODE_KEY) || "editor";
    let userMuted = false;
    function applyAudioRouting() {
      if (localVideo) {
        localVideo.muted = userMuted || audioMode === "output";
      }
      bridge.send("SET_MUTED", { muted: userMuted || audioMode === "editor" });
      updateTransportUI();
    }
    function syncPlaybackToDisplay() {
      if (!localVideo) return;
      bridge.send("SEEK", { time: localVideo.currentTime });
      if (!localVideo.paused) {
        bridge.send("PLAY");
      } else {
        bridge.send("PAUSE");
      }
      bridge.send("SET_VOLUME", { volume: localVideo.volume });
      bridge.send("SET_MUTED", { muted: userMuted || audioMode === "editor" });
    }
    $("tp-play").addEventListener("click", () => {
      if (!localVideo) {
        const active = playlistManager.getActive();
        if (active && active.items.length > 0) {
          const item = active.items[0];
          const src = sourceManager.getById(item.sourceId);
          if (src) {
            onAddVideoLayer(src.url, src.name);
            setTimeout(() => {
              if (localVideo) {
                userMuted = false;
                applyAudioRouting();
                loadPlaylistItem(0);
                setTimeout(() => {
                  if (localVideo) localVideo.play().catch(() => {
                  });
                  sendPlaylistToDisplay();
                  bridge.send("PLAY");
                  updateTransportUI();
                }, 200);
              }
            }, 100);
          }
        }
        return;
      }
      if (localVideo.paused) {
        userMuted = false;
        applyAudioRouting();
        if (!localVideo.src || localVideo.src === window.location.href) {
          const active = playlistManager.getActive();
          if (active && active.items.length > 0) {
            loadPlaylistItem(0);
            setTimeout(() => {
              if (localVideo) localVideo.play().catch(() => {
              });
              updateTransportUI();
            }, 200);
          }
        } else {
          localVideo.play().catch(() => {
          });
        }
        bridge.send("PLAY");
        updateTransportUI();
      } else {
        localVideo.pause();
        bridge.send("PAUSE");
      }
    });
    $("tp-stop").addEventListener("click", () => {
      if (localVideo) {
        localVideo.pause();
        localVideo.currentTime = 0;
      }
      bridge.send("STOP");
      updateTransportUI();
    });
    $("tp-prev").addEventListener("click", () => localPrev());
    $("tp-next").addEventListener("click", () => localNext());
    $("tp-rw").addEventListener("click", () => {
      if (localVideo) {
        const t = Math.max(0, localVideo.currentTime - 10);
        localVideo.currentTime = t;
        bridge.send("SEEK", { time: t });
      }
    });
    $("tp-ff").addEventListener("click", () => {
      if (localVideo) {
        const t = localVideo.currentTime + 10;
        localVideo.currentTime = t;
        bridge.send("SEEK", { time: t });
      }
    });
    const seekBar = $("tp-seek");
    let seekDragging = false;
    seekBar.addEventListener("pointerdown", () => {
      seekDragging = true;
    });
    seekBar.addEventListener("pointerup", () => {
      seekDragging = false;
    });
    seekBar.addEventListener("input", () => {
      if (localVideo && localVideo.duration > 0) {
        const time = parseInt(seekBar.value) / 1e3 * localVideo.duration;
        localVideo.currentTime = time;
        bridge.send("SEEK", { time });
      }
    });
    $("tp-vol").addEventListener("input", (e) => {
      const vol = parseInt(e.target.value) / 100;
      if (localVideo) localVideo.volume = vol;
      bridge.send("SET_VOLUME", { volume: vol });
    });
    $("tp-mute").addEventListener("click", () => {
      userMuted = !userMuted;
      applyAudioRouting();
    });
    $("tp-audioOut").value = audioMode;
    $("tp-audioOut").addEventListener("change", (e) => {
      audioMode = e.target.value;
      localStorage.setItem(AUDIO_MODE_KEY, audioMode);
      applyAudioRouting();
    });
    function setActiveVideo(video) {
      if (localVideo && localVideo !== video) localVideo.muted = true;
      localVideo = video;
      video.addEventListener("timeupdate", updateTransportUI);
      video.addEventListener("play", () => {
        if (localVideo === video) applyAudioRouting();
        updateTransportUI();
      });
      video.addEventListener("pause", updateTransportUI);
      video.addEventListener("ended", onLocalVideoEnded);
      video.addEventListener("loadedmetadata", updateTransportUI);
      applyAudioRouting();
    }
    mediaContainer.addEventListener("keydown", (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") e.stopPropagation();
    });
    function updateTransportUI() {
      const v = localVideo;
      const playing = v ? !v.paused : false;
      const currentTime = v?.currentTime || 0;
      const duration = v?.duration || 0;
      $("tp-play").innerHTML = playing ? "&#9646;&#9646;" : "&#9654;";
      if (duration > 0 && !seekDragging) {
        seekBar.value = String(Math.round(currentTime / duration * 1e3));
      }
      $("tp-time").textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
      const name = getCurrentSourceName();
      $("tp-now").textContent = name || "No media";
      if (v) {
        $("tp-vol").value = String(Math.round(v.volume * 100));
        const muteBtn = $("tp-mute");
        muteBtn.textContent = userMuted ? "M" : "\u266A";
        muteBtn.style.color = userMuted ? "#f55" : "#ccc";
      }
    }
    function renderLibrary() {
      const el = $("vp-library");
      if (!el) return;
      const sources = sourceManager.getAll();
      el.innerHTML = "";
      if (sources.length === 0) {
        el.innerHTML = '<div style="color:#555;font-size:11px;padding:4px;">No media added yet</div>';
        return;
      }
      sources.forEach((src) => {
        const row = document.createElement("div");
        row.className = "mlmap-media-item";
        const name = document.createElement("span");
        name.className = "name";
        name.textContent = src.type === "capture" ? `[LIVE] ${src.name}` : src.name;
        name.title = src.type === "capture" ? "Screen capture" : src.url;
        if (src.type === "capture") name.style.color = "#5f5";
        const btns = document.createElement("span");
        btns.style.cssText = "display:flex;gap:2px;flex-shrink:0;";
        const layerBtn = document.createElement("button");
        layerBtn.className = "mlmap-btn";
        layerBtn.textContent = "Layer";
        layerBtn.title = "Create video layer";
        layerBtn.style.cssText = "font-size:10px;padding:2px 4px;";
        layerBtn.addEventListener("click", () => {
          const stream = sourceManager.getStream(src.id);
          onAddVideoLayer(src.url, src.name, stream);
        });
        const plBtn = document.createElement("button");
        if (src.type !== "capture") {
          plBtn.className = "mlmap-btn";
          plBtn.textContent = "+PL";
          plBtn.title = "Add to playlist";
          plBtn.style.cssText = "font-size:10px;padding:2px 4px;";
          plBtn.addEventListener("click", () => {
            const active = playlistManager.getActive();
            if (active) {
              playlistManager.addItem(active.id, src.id);
              renderPlaylist();
            }
          });
        }
        const delBtn = document.createElement("button");
        delBtn.className = "mlmap-btn";
        delBtn.textContent = "x";
        delBtn.title = "Remove";
        delBtn.style.cssText = "font-size:10px;padding:2px 4px;color:#f55;";
        delBtn.addEventListener("click", () => {
          sourceManager.remove(src.id);
          renderLibrary();
        });
        btns.appendChild(layerBtn);
        btns.appendChild(plBtn);
        btns.appendChild(delBtn);
        row.appendChild(name);
        row.appendChild(btns);
        el.appendChild(row);
      });
    }
    function renderPlaylistSelector() {
      const sel = $("vp-plSelect");
      if (!sel) return;
      const playlists = playlistManager.getAll();
      const active = playlistManager.getActive();
      sel.innerHTML = "";
      playlists.forEach((pl) => {
        const opt = document.createElement("option");
        opt.value = pl.id;
        opt.textContent = pl.name;
        if (active && active.id === pl.id) opt.selected = true;
        sel.appendChild(opt);
      });
    }
    function renderPlaylist() {
      const el = $("vp-playlist");
      if (!el) return;
      const active = playlistManager.getActive();
      el.innerHTML = "";
      if (!active) return;
      $("vp-loop").textContent = `Loop: ${active.loop ? "ON" : "OFF"}`;
      if (active.items.length === 0) {
        el.innerHTML = '<div style="color:#555;font-size:11px;padding:4px;">Playlist empty</div>';
        return;
      }
      active.items.forEach((item, idx) => {
        const src = sourceManager.getById(item.sourceId);
        const row = document.createElement("div");
        row.className = "mlmap-pl-item";
        const label = document.createElement("span");
        label.className = "name";
        label.textContent = `${idx + 1}. ${src?.name || "Unknown"}`;
        const btns = document.createElement("span");
        btns.style.cssText = "display:flex;gap:1px;flex-shrink:0;";
        const upBtn = document.createElement("button");
        upBtn.className = "mlmap-btn";
        upBtn.innerHTML = "&#9650;";
        upBtn.style.cssText = "font-size:8px;padding:1px 3px;";
        upBtn.addEventListener("click", () => {
          playlistManager.moveItem(active.id, item.id, "up");
          renderPlaylist();
        });
        const downBtn = document.createElement("button");
        downBtn.className = "mlmap-btn";
        downBtn.innerHTML = "&#9660;";
        downBtn.style.cssText = "font-size:8px;padding:1px 3px;";
        downBtn.addEventListener("click", () => {
          playlistManager.moveItem(active.id, item.id, "down");
          renderPlaylist();
        });
        const delBtn = document.createElement("button");
        delBtn.className = "mlmap-btn";
        delBtn.textContent = "x";
        delBtn.style.cssText = "font-size:9px;padding:1px 3px;color:#f55;";
        delBtn.addEventListener("click", () => {
          playlistManager.removeItem(active.id, item.id);
          renderPlaylist();
        });
        btns.appendChild(upBtn);
        btns.appendChild(downBtn);
        btns.appendChild(delBtn);
        row.appendChild(label);
        row.appendChild(btns);
        el.appendChild(row);
      });
    }
    function sendPlaylistToDisplay() {
      const active = playlistManager.getActive();
      if (!active) return;
      const items = active.items.map((item) => {
        const src = sourceManager.getById(item.sourceId);
        return { url: src?.url || "", name: src?.name || "Unknown" };
      }).filter((i) => i.url);
      bridge.send("LOAD_PLAYLIST", { items, loop: active.loop, startIndex: localPlaylistIndex });
    }
    renderLibrary();
    renderPlaylistSelector();
    renderPlaylist();
    return {
      sourceManager,
      playlistManager,
      sendPlaylistToDisplay,
      syncPlaybackToDisplay,
      registerVideoElement,
      setActiveVideo,
      getActiveVideo: () => localVideo
    };
  }

  // src/utils/workflow.ts
  init_data();
  var MANAGED_LAYERS_KEY = "mlmap.managedLayers";
  var VIDEO_SOURCES_KEY = "mlmap:videoSources";
  var PLAYLISTS_KEY = "mlmap:playlists";
  var ACTIVE_PLAYLIST_KEY = "mlmap:activePlaylist";
  var CURRENT_WS_KEY = "mlmap:currentWorkspaceId";
  function exportWorkflow(workspaceName) {
    const wsId = localStorage.getItem(CURRENT_WS_KEY) || "default";
    const wsRaw = localStorage.getItem(`mlmap:workspace<${wsId}>`);
    const ws = wsRaw ? JSON.parse(wsRaw) : { id: wsId, name: "Workspace", version: "1.0", layout: [] };
    let managedLayers = [];
    try {
      const raw = localStorage.getItem(MANAGED_LAYERS_KEY);
      if (raw) managedLayers = JSON.parse(raw);
    } catch {
    }
    let videoSources = [];
    try {
      const raw = localStorage.getItem(VIDEO_SOURCES_KEY);
      if (raw) videoSources = JSON.parse(raw);
    } catch {
    }
    videoSources = videoSources.filter((s) => s.type === "url");
    let playlists = [];
    try {
      const raw = localStorage.getItem(PLAYLISTS_KEY);
      if (raw) playlists = JSON.parse(raw);
    } catch {
    }
    const activePlaylistId = localStorage.getItem(ACTIVE_PLAYLIST_KEY);
    return {
      version: VERSION,
      name: workspaceName || ws.name || "Workflow",
      timestamp: Date.now(),
      workspace: {
        id: ws.id,
        name: ws.name,
        layout: ws.layout
      },
      managedLayers,
      videoSources,
      playlists,
      activePlaylistId
    };
  }
  function importWorkflow(data) {
    const newWsId = Date.now().toString();
    const workspace = {
      id: newWsId,
      name: data.name || data.workspace.name || "Imported",
      version: "1.0",
      layout: data.workspace.layout || []
    };
    localStorage.setItem(`mlmap:workspace<${newWsId}>`, JSON.stringify(workspace));
    localStorage.setItem(CURRENT_WS_KEY, newWsId);
    if (data.managedLayers) {
      localStorage.setItem(MANAGED_LAYERS_KEY, JSON.stringify(data.managedLayers));
    }
    if (data.videoSources && data.videoSources.length > 0) {
      let existing = [];
      try {
        const raw = localStorage.getItem(VIDEO_SOURCES_KEY);
        if (raw) existing = JSON.parse(raw);
      } catch {
      }
      const existingUrls = new Set(existing.map((s) => s.url));
      for (const src of data.videoSources) {
        if (!existingUrls.has(src.url)) {
          existing.push(src);
          existingUrls.add(src.url);
        }
      }
      localStorage.setItem(VIDEO_SOURCES_KEY, JSON.stringify(existing));
    }
    if (data.playlists && data.playlists.length > 0) {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(data.playlists));
    }
    if (data.activePlaylistId) {
      localStorage.setItem(ACTIVE_PLAYLIST_KEY, data.activePlaylistId);
    }
  }
  function workflowToBase64(data) {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function base64ToWorkflow(encoded) {
    try {
      let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      const data = JSON.parse(json);
      if (!data.workspace || !data.version) return null;
      return data;
    } catch {
      return null;
    }
  }
  function generateShareUrl(data) {
    const encoded = workflowToBase64(data);
    const base = window.location.origin + window.location.pathname;
    return `${base}?workflow=${encoded}`;
  }
  function checkUrlForWorkflow() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("workflow");
    if (!encoded) return false;
    const data = base64ToWorkflow(encoded);
    if (!data) {
      console.warn("MLMap: Invalid workflow data in URL");
      return false;
    }
    importWorkflow(data);
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    return true;
  }
  function downloadWorkflow(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.mlmap`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function uploadWorkflow() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".mlmap,.json";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            if (!data.workspace || !data.version) {
              alert("Invalid workflow file.");
              resolve(null);
              return;
            }
            resolve(data);
          } catch {
            alert("Failed to parse workflow file.");
            resolve(null);
          }
        };
        reader.readAsText(file);
      });
      input.click();
    });
  }

  // src/video/clipMaskRenderer.ts
  var ClipMaskRenderer = class {
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

  // src/uiControls/index.ts
  function initUIControls(baseMLMap2) {
    const tooSmall = window.innerWidth < 900 || window.innerHeight < 500;
    const touchOnly = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
    if (tooSmall || touchOnly) {
      const overlay = document.createElement("div");
      overlay.id = "mlmap-device-warning";
      overlay.style.cssText = "position:fixed;inset:0;z-index:9999999;background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#ccc;padding:32px;";
      overlay.innerHTML = `
            <div style="font-size:48px;margin-bottom:16px;">\u{1F5A5}\uFE0F</div>
            <h2 style="color:#fff;margin:0 0 12px;font-size:20px;">Screen too small</h2>
            <p style="max-width:400px;line-height:1.6;margin:0 0 24px;color:#999;">
                MLMap requires a computer or tablet with a keyboard and mouse.<br>
                Minimum screen size: 900 &times; 500 px.
            </p>
            <p style="font-size:12px;color:#555;">Current: ${window.innerWidth} &times; ${window.innerHeight} px</p>
        `;
      document.body.appendChild(overlay);
      window.addEventListener("resize", () => {
        const ok = window.innerWidth >= 900 && window.innerHeight >= 500;
        if (ok && overlay.parentElement) {
          overlay.remove();
        }
      });
      return;
    }
    const style = document.createElement("style");
    style.textContent = `
        #mlmap-app {
            position: fixed;
            inset: 0;
            display: grid;
            grid-template-rows: 38px 1fr 48px;
            grid-template-columns: 210px 1fr 270px;
            grid-template-areas:
                "toolbar toolbar toolbar"
                "left center right"
                "transport transport transport";
            z-index: 1000001;
            pointer-events: none;
            font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            color: #ccc;
            user-select: none;
        }
        #mlmap-toolbar {
            grid-area: toolbar;
            pointer-events: auto;
            background: #1a1a1a;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
        }
        #mlmap-left {
            grid-area: left;
            pointer-events: auto;
            background: #222;
            border-right: 1px solid #333;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        #mlmap-right {
            grid-area: right;
            pointer-events: auto;
            background: #222;
            border-left: 1px solid #333;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        #mlmap-transport {
            grid-area: transport;
            pointer-events: auto;
            background: #1a1a1a;
            border-top: 1px solid #333;
            display: flex;
            align-items: center;
            padding: 0 10px;
            gap: 8px;
        }
        .mlmap-section {
            padding: 8px;
            border-bottom: 1px solid #333;
        }
        .mlmap-section-title {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888;
            margin-bottom: 6px;
        }
        .mlmap-btn {
            background: #383838;
            color: #ccc;
            border: none;
            border-radius: 3px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            font-family: inherit;
        }
        .mlmap-btn:hover { background: #484848; color: #fff; }
        .mlmap-btn:active { background: #555; }
        .mlmap-btn-primary { background: #2a6cb5; color: #fff; }
        .mlmap-btn-primary:hover { background: #3580d0; }
        .mlmap-input {
            background: #1a1a1a;
            color: #ccc;
            border: 1px solid #444;
            border-radius: 3px;
            padding: 4px 6px;
            font-size: 11px;
            font-family: inherit;
            outline: none;
        }
        .mlmap-input:focus { border-color: #2a6cb5; }
        .mlmap-select {
            background: #1a1a1a;
            color: #ccc;
            border: 1px solid #444;
            border-radius: 3px;
            padding: 4px 6px;
            font-size: 11px;
            font-family: inherit;
            outline: none;
        }
        .mlmap-layer-item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 3px 6px;
            border-radius: 3px;
            cursor: default;
        }
        .mlmap-layer-item:hover { background: #2a2a2a; }
        .mlmap-layer-item .name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 11px;
        }
        .mlmap-layer-item .icon {
            width: 14px;
            text-align: center;
            flex-shrink: 0;
            font-size: 10px;
        }
        .mlmap-layer-item .del-btn {
            opacity: 0;
            cursor: pointer;
            color: #f55;
            background: none;
            border: none;
            font-size: 11px;
            padding: 0 2px;
        }
        .mlmap-layer-item:hover .del-btn { opacity: 1; }
        .mlmap-media-item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 3px 6px;
            border-radius: 3px;
        }
        .mlmap-media-item:hover { background: #2a2a2a; }
        .mlmap-media-item .name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 11px;
        }
        .mlmap-pl-item {
            display: flex;
            align-items: center;
            gap: 2px;
            padding: 3px 4px;
            border-radius: 3px;
            font-size: 11px;
        }
        .mlmap-pl-item:hover { background: #2a2a2a; }
        .mlmap-pl-item .name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .transport-btn {
            background: #333;
            color: #ccc;
            border: none;
            width: 30px;
            height: 26px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .transport-btn:hover { background: #444; color: #fff; }
        .mlmap-range {
            -webkit-appearance: none;
            appearance: none;
            background: #333;
            height: 6px;
            border-radius: 3px;
            outline: none;
            cursor: pointer;
        }
        .mlmap-range::-webkit-slider-runnable-track {
            height: 6px;
            border-radius: 3px;
        }
        .mlmap-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #aaa;
            cursor: pointer;
            margin-top: -4px;
        }
        .mlmap-range::-webkit-slider-thumb:hover { background: #fff; }
        .mlmap-range::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #aaa;
            cursor: pointer;
            border: none;
        }
        .mlmap-range::-moz-range-track {
            height: 6px;
            border-radius: 3px;
            background: #333;
        }
        .toolbar-group {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .app-title {
            font-weight: 700;
            font-size: 14px;
            color: #fff;
            letter-spacing: -0.5px;
            margin-right: 8px;
        }
        .status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            display: inline-block;
        }
        .status-dot.connected { background: #4CAF50; }
        .status-dot.disconnected { background: #555; }
        #mlmap-left::-webkit-scrollbar,
        #mlmap-right::-webkit-scrollbar { width: 5px; }
        #mlmap-left::-webkit-scrollbar-track,
        #mlmap-right::-webkit-scrollbar-track { background: #1a1a1a; }
        #mlmap-left::-webkit-scrollbar-thumb,
        #mlmap-right::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        .add-layer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3px;
        }
        .ws-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 3px;
            margin-top: 4px;
        }
        /* Context menu */
        #mlmap-context-menu {
            position: fixed;
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 0;
            min-width: 180px;
            z-index: 1000010;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            color: #ccc;
            display: none;
            pointer-events: auto;
        }
        .ctx-item {
            padding: 6px 16px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ctx-item:hover { background: #3a3a3a; color: #fff; }
        .ctx-item .shortcut { color: #666; font-size: 10px; margin-left: 16px; }
        .ctx-sep { height: 1px; background: #444; margin: 3px 8px; }
        .ctx-item.disabled { color: #555; pointer-events: none; }
        .ctx-has-sub {
            position: relative;
        }
        .ctx-has-sub > .ctx-item { cursor: default; }
        .ctx-arrow { margin-left: auto; padding-left: 12px; font-size: 10px; color: #666; }
        .ctx-submenu {
            position: absolute;
            left: 100%;
            top: -4px;
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 0;
            min-width: 170px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: none;
        }
        .ctx-has-sub:hover > .ctx-submenu { display: block; }
    `;
    document.head.appendChild(style);
    const bridge = new ChannelBridge("control");
    let displayWindow = null;
    let managedLayers = [];
    const MANAGED_LAYERS_KEY2 = "mlmap.managedLayers";
    const clipMaskRenderer = new ClipMaskRenderer(() => getClipGroups());
    function getClipGroups() {
      const groups = [];
      const allLayers = baseMLMap2.getLayers();
      const grouped = /* @__PURE__ */ new Map();
      for (const ml of managedLayers) {
        if (!ml.clipTo) continue;
        const baseMl = managedLayers.find((b) => b.id === ml.clipTo);
        if (!baseMl) continue;
        const baseInternalLayer = allLayers.find((l) => l.element.id === baseMl.id);
        const maskInternalLayer = allLayers.find((l) => l.element.id === ml.id);
        if (!baseInternalLayer || !maskInternalLayer) continue;
        const baseEl = document.getElementById(baseMl.id);
        if (!baseEl) continue;
        const video = baseEl.querySelector("video");
        if (!video) continue;
        if (!grouped.has(baseMl.id)) {
          grouped.set(baseMl.id, {
            video,
            baseTargetPoints: baseInternalLayer.targetPoints.map((p) => [p[0], p[1]]),
            masks: []
          });
        }
        grouped.get(baseMl.id).masks.push({
          targetPoints: maskInternalLayer.targetPoints.map((p) => [p[0], p[1]])
        });
      }
      for (const g of grouped.values()) groups.push(g);
      return groups;
    }
    function hasAnyClipMasks() {
      return managedLayers.some((ml) => !!ml.clipTo);
    }
    function updateClipMaskRendererState() {
      if (hasAnyClipMasks()) clipMaskRenderer.start();
      else clipMaskRenderer.stop();
    }
    const workspace = document.createElement("div");
    workspace.id = "mlmap-workspace";
    workspace.style.cssText = "position:fixed;inset:0;transform-origin:center center;";
    document.body.appendChild(workspace);
    const app = document.createElement("div");
    app.id = "mlmap-app";
    app.innerHTML = `
        <div id="mlmap-toolbar">
            <div class="toolbar-group">
                <span class="app-title">MLMap</span>
                <span style="font-size:10px;color:#666;">v${VERSION}</span>
                <button id="tb-toggleLeft" class="mlmap-btn" title="Toggle layers panel" style="font-size:10px;padding:4px 5px;">&laquo;</button>
            </div>
            <div class="toolbar-group">
                <span style="font-size:10px;color:#666;">Zoom</span>
                <input id="tb-zoom" type="range" min="25" max="100" value="100" class="mlmap-range" style="width:80px;" title="Workspace zoom">
                <span id="tb-zoomLabel" style="font-size:10px;color:#888;min-width:30px;">100%</span>
            </div>
            <div class="toolbar-group">
                <select id="tb-monitor" class="mlmap-select" title="Select output monitor" style="max-width:140px;">
                    <option value="">Monitor...</option>
                </select>
                <button id="tb-launch" class="mlmap-btn mlmap-btn-primary">Launch Output</button>
                <button id="tb-fullscreen" class="mlmap-btn" title="Fullscreen output">FS</button>
                <span class="status-dot disconnected" id="tb-status" title="Display disconnected"></span>
                <button id="tb-toggleRight" class="mlmap-btn" title="Toggle media panel" style="font-size:10px;padding:4px 5px;">&raquo;</button>
            </div>
        </div>
        <div id="mlmap-left"></div>
        <div id="mlmap-right"></div>
        <div id="mlmap-transport"></div>
    `;
    document.body.appendChild(app);
    app.addEventListener("mousedown", (e) => e.stopPropagation());
    const ctxMenu = document.createElement("div");
    ctxMenu.id = "mlmap-context-menu";
    document.body.appendChild(ctxMenu);
    ctxMenu.addEventListener("mousedown", (e) => e.stopPropagation());
    const leftPanel = document.getElementById("mlmap-left");
    const rightPanel = document.getElementById("mlmap-right");
    const transportBar = document.getElementById("mlmap-transport");
    leftPanel.innerHTML = `
        <div class="mlmap-section">
            <div class="mlmap-section-title">Layers</div>
            <div id="lp-layerList"></div>
            <div class="mlmap-section-title" style="margin-top:8px;">Add Layer</div>
            <div class="add-layer-grid">
                <button id="lp-addSquare" class="mlmap-btn">&#9633; Square</button>
                <button id="lp-addCircle" class="mlmap-btn">&#9675; Circle</button>
                <button id="lp-addTriangle" class="mlmap-btn">&#9651; Triangle</button>
                <button id="lp-addIframe" class="mlmap-btn">&#8865; iframe</button>
            </div>
            <div class="mlmap-section-title" style="margin-top:8px;">Options</div>
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">
                <input type="checkbox" id="lp-snap" checked> Snap to edges (G)
            </label>
        </div>
        <div class="mlmap-section">
            <div class="mlmap-section-title">Workspaces</div>
            <select id="lp-wsSelect" class="mlmap-select" style="width:100%;"></select>
            <div class="ws-grid">
                <button id="lp-wsAdd" class="mlmap-btn" title="New">+</button>
                <button id="lp-wsDup" class="mlmap-btn" title="Duplicate">&#128203;</button>
                <button id="lp-wsRen" class="mlmap-btn" title="Rename">&#9998;</button>
                <button id="lp-wsReset" class="mlmap-btn" title="Reset">&#8634;</button>
                <button id="lp-wsDel" class="mlmap-btn" title="Delete">&#128465;</button>
            </div>
            <div class="mlmap-section-title" style="margin-top:8px;">Import / Export</div>
            <div style="display:flex;flex-direction:column;gap:3px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
                    <button id="lp-wfExport" class="mlmap-btn" title="Export workflow to .mlmap file">Export File</button>
                    <button id="lp-wfImport" class="mlmap-btn" title="Import workflow from .mlmap file">Import File</button>
                </div>
                <button id="lp-wfShare" class="mlmap-btn mlmap-btn-primary" title="Copy share URL to clipboard" style="width:100%;">Copy Share URL</button>
            </div>
        </div>
        <div class="mlmap-section" style="border-bottom:none;">
            <div class="mlmap-section-title">Shortcuts</div>
            <pre style="font-size:10px;color:#666;margin:0;white-space:pre-wrap;line-height:1.5;">SHIFT+Space: Toggle edit mode
Drag: Move | SHIFT+Drag: Precise
ALT+Drag: Rotate/Scale
Ctrl+Click: Multi-select layers
Drag empty: Rubber band select
Arrows: Move | S: Solo | C: Cross
R: Rotate | H/V: Flip | B: Bounds
DEL: Delete | Ctrl+Z/Y: Undo/Redo
G: Toggle snap | Right-click: Menu</pre>
        </div>
    `;
    const videoCtrl = initVideoUI(rightPanel, transportBar, bridge, onAddVideoLayer);
    function sendVideoDataToDisplay(layerId, url) {
      if (!url || !url.startsWith("blob:")) return;
      fetch(url).then((r) => r.arrayBuffer()).then((buf) => {
        bridge.send("SEND_VIDEO_DATA", { layerId, data: buf, mimeType: "video/mp4" });
      }).catch(() => {
      });
    }
    function onAddVideoLayer(url, name, stream) {
      const id = `vlayer_${Date.now()}`;
      const div = document.createElement("div");
      div.id = id;
      div.style.position = "fixed";
      div.style.top = "0px";
      div.style.left = "0px";
      div.style.width = "400px";
      div.style.height = "300px";
      div.style.overflow = "hidden";
      div.style.background = "#000";
      const video = document.createElement("video");
      if (stream) {
        video.srcObject = stream;
        video.autoplay = true;
      } else {
        video.src = url;
        video.preload = "metadata";
      }
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "contain";
      video.muted = true;
      video.playsInline = true;
      div.appendChild(video);
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            if (stream.getTracks().every((t) => t.readyState === "ended")) {
              video.srcObject = null;
              div.innerHTML = "";
              const ph = document.createElement("div");
              ph.className = "mlmap-video-placeholder";
              ph.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;";
              ph.innerHTML = `<span style="font-size:18px;color:#555;">&#9632;</span><span style="font-size:10px;color:#555;margin-top:2px;">${name}</span><span style="font-size:9px;color:#444;margin-top:2px;">Capture ended</span>`;
              div.appendChild(ph);
              renderLayerList();
            }
          });
        });
      }
      workspace.appendChild(div);
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      baseMLMap2.addLayer(div, [[cx - 200, cy - 150], [cx + 200, cy - 150], [cx + 200, cy + 150], [cx - 200, cy + 150]]);
      videoCtrl.registerVideoElement(video);
      const layerInfo = { id, name, type: "video", videoUrl: stream ? void 0 : url, width: 400, height: 300 };
      managedLayers.push(layerInfo);
      saveManagedLayers();
      renderLayerList();
      bridge.send("ADD_LAYER", layerInfo);
      if (!stream && url) sendVideoDataToDisplay(id, url);
      setTimeout(() => bridge.send("UPDATE_LAYOUT", { layout: baseMLMap2.getLayout() }), 100);
    }
    function createShape(type) {
      const id = `shape_${Date.now()}`;
      const div = document.createElement("div");
      div.id = id;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      div.style.position = "fixed";
      div.style.top = "0px";
      div.style.left = "0px";
      div.style.width = "100px";
      div.style.height = "100px";
      div.style.background = type === "triangle" ? "transparent" : "white";
      div.style.border = type === "triangle" ? "2px solid white" : "none";
      if (type === "circle") div.style.borderRadius = "50%";
      if (type === "triangle") {
        div.style.width = "0";
        div.style.height = "0";
        div.style.borderLeft = "50px solid transparent";
        div.style.borderRight = "50px solid transparent";
        div.style.borderBottom = "100px solid white";
      }
      workspace.appendChild(div);
      const hw = type === "triangle" ? 50 : 50;
      const hh = 50;
      const centerPts = type === "triangle" ? [[cx, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh], [cx, cy + hh]] : [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh]];
      baseMLMap2.addLayer(div, centerPts);
      const layerInfo = { id, name: `${type}`, type: "shape", shapeType: type, width: 100, height: 100 };
      managedLayers.push(layerInfo);
      saveManagedLayers();
      renderLayerList();
      bridge.send("ADD_LAYER", layerInfo);
      setTimeout(() => bridge.send("UPDATE_LAYOUT", { layout: baseMLMap2.getLayout() }), 100);
    }
    function createIframeLayer(url) {
      const id = `iframe_${Date.now()}`;
      const div = document.createElement("div");
      div.id = id;
      div.style.position = "fixed";
      div.style.top = "0px";
      div.style.left = "0px";
      div.style.width = "400px";
      div.style.height = "300px";
      div.style.overflow = "hidden";
      div.style.background = "#000";
      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.pointerEvents = "none";
      iframe.setAttribute("allow", "autoplay; encrypted-media");
      div.appendChild(iframe);
      workspace.appendChild(div);
      const icx = window.innerWidth / 2, icy = window.innerHeight / 2;
      baseMLMap2.addLayer(div, [[icx - 200, icy - 150], [icx + 200, icy - 150], [icx + 200, icy + 150], [icx - 200, icy + 150]]);
      const name = url.replace(/^https?:\/\//, "").split("/")[0] || "iframe";
      const layerInfo = { id, name, type: "iframe", iframeUrl: url, width: 400, height: 300 };
      managedLayers.push(layerInfo);
      saveManagedLayers();
      renderLayerList();
      bridge.send("ADD_LAYER", layerInfo);
      setTimeout(() => bridge.send("UPDATE_LAYOUT", { layout: baseMLMap2.getLayout() }), 100);
    }
    function deleteLayer(id) {
      managedLayers.forEach((ml2) => {
        if (ml2.clipTo === id) releaseClipMask(ml2.id);
      });
      const ml = managedLayers.find((l) => l.id === id);
      if (ml?.clipTo) releaseClipMask(id);
      const el = document.getElementById(id);
      if (el) el.remove();
      managedLayers = managedLayers.filter((l) => l.id !== id);
      saveManagedLayers();
      renderLayerList();
      bridge.send("REMOVE_LAYER", { id });
      updateClipMaskRendererState();
    }
    function createClipMask(maskId) {
      const maskMl = managedLayers.find((l) => l.id === maskId);
      if (!maskMl || maskMl.type !== "shape") return;
      const idx = managedLayers.indexOf(maskMl);
      let baseId = null;
      for (let i = idx - 1; i >= 0; i--) {
        if (managedLayers[i].type === "video") {
          baseId = managedLayers[i].id;
          break;
        }
      }
      if (!baseId) {
        for (let i = idx + 1; i < managedLayers.length; i++) {
          if (managedLayers[i].type === "video") {
            baseId = managedLayers[i].id;
            break;
          }
        }
      }
      if (!baseId) return;
      maskMl.clipTo = baseId;
      const baseEl = document.getElementById(baseId);
      if (baseEl) baseEl.style.opacity = "0";
      const maskEl = document.getElementById(maskId);
      if (maskEl) maskEl.style.opacity = "0";
      if (baseEl) {
        const video = baseEl.querySelector("video");
        if (video) {
          if (video.paused) video.play().catch(() => {
          });
          videoCtrl.setActiveVideo(video);
        }
      }
      saveManagedLayers();
      renderLayerList();
      updateClipMaskRendererState();
      bridge.send("ADD_LAYER", maskMl);
    }
    function releaseClipMask(maskId) {
      const maskMl = managedLayers.find((l) => l.id === maskId);
      if (!maskMl || !maskMl.clipTo) return;
      const baseId = maskMl.clipTo;
      maskMl.clipTo = void 0;
      const maskEl = document.getElementById(maskId);
      if (maskEl) {
        maskEl.style.opacity = "1";
        if (maskMl.shapeType === "triangle") {
          maskEl.style.borderBottomColor = "white";
        } else if (maskMl.shapeType === "circle") {
          maskEl.style.background = "white";
        } else {
          maskEl.style.background = "white";
        }
      }
      const stillMasked = managedLayers.some((l) => l.clipTo === baseId);
      if (!stillMasked) {
        const baseEl = document.getElementById(baseId);
        if (baseEl) baseEl.style.opacity = "1";
      }
      saveManagedLayers();
      renderLayerList();
      updateClipMaskRendererState();
      bridge.send("ADD_LAYER", maskMl);
    }
    function syncManagedLayerOrder() {
      const allLayers = baseMLMap2.getLayers();
      const idOrder = allLayers.map((l) => l.element.id);
      managedLayers.sort((a, b) => {
        const ia = idOrder.indexOf(a.id);
        const ib = idOrder.indexOf(b.id);
        return ia - ib;
      });
      saveManagedLayers();
      renderLayerList();
    }
    function renderLayerList() {
      const list = document.getElementById("lp-layerList");
      list.innerHTML = "";
      if (managedLayers.length === 0) {
        list.innerHTML = '<div style="color:#555;font-size:11px;padding:4px;">No layers</div>';
        return;
      }
      managedLayers.forEach((layer) => {
        const row = document.createElement("div");
        row.className = "mlmap-layer-item";
        if (layer.clipTo) row.style.paddingLeft = "18px";
        const icon = document.createElement("span");
        icon.className = "icon";
        if (layer.type === "video") icon.textContent = "\u25B6";
        else if (layer.type === "iframe") icon.textContent = "\u29C9";
        else if (layer.shapeType === "circle") icon.textContent = "\u25CF";
        else if (layer.shapeType === "triangle") icon.textContent = "\u25B2";
        else icon.textContent = "\u25A0";
        const isPlaceholderVideo = layer.type === "video" && !document.getElementById(layer.id)?.querySelector("video");
        const name = document.createElement("span");
        name.className = "name";
        if (layer.clipTo) name.textContent = `${layer.name} (clip)`;
        else if (isPlaceholderVideo) {
          name.textContent = `${layer.name}`;
          name.style.color = "#f80";
        } else name.textContent = layer.name;
        const del = document.createElement("button");
        del.className = "del-btn";
        del.textContent = "\u2715";
        del.addEventListener("click", () => deleteLayer(layer.id));
        row.appendChild(icon);
        row.appendChild(name);
        row.appendChild(del);
        list.appendChild(row);
      });
    }
    function saveManagedLayers() {
      const persistable = managedLayers.map((l) => {
        if (l.type === "video") return { ...l, videoUrl: void 0 };
        return l;
      });
      localStorage.setItem(MANAGED_LAYERS_KEY2, JSON.stringify(persistable));
    }
    function loadManagedLayers() {
      try {
        const stored = localStorage.getItem(MANAGED_LAYERS_KEY2);
        if (stored) {
          const items = JSON.parse(stored);
          items.forEach((s) => restoreLayer(s));
        }
        const legacy = localStorage.getItem("mlmap.dynamicShapes");
        if (legacy && !stored) {
          const oldShapes = JSON.parse(legacy);
          oldShapes.forEach((s) => {
            const info = { id: s.id, name: s.type, type: "shape", shapeType: s.type, width: 100, height: 100 };
            restoreLayer(info);
          });
        }
      } catch {
      }
      renderLayerList();
    }
    function restoreLayer(info) {
      const div = document.createElement("div");
      div.id = info.id;
      div.style.position = "fixed";
      div.style.top = "0px";
      div.style.left = "0px";
      div.style.width = info.width + "px";
      div.style.height = info.height + "px";
      if (info.type === "video") {
        div.style.overflow = "hidden";
        div.style.background = "#111";
        const ph = document.createElement("div");
        ph.className = "mlmap-video-placeholder";
        ph.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;";
        ph.innerHTML = `<span style="font-size:18px;color:#555;">\u25B6</span><span style="font-size:10px;color:#555;margin-top:2px;">${info.name}</span><span style="font-size:9px;color:#444;margin-top:2px;">Re-import video</span>`;
        div.appendChild(ph);
      } else if (info.type === "iframe" && info.iframeUrl) {
        div.style.overflow = "hidden";
        div.style.background = "#000";
        const iframe = document.createElement("iframe");
        iframe.src = info.iframeUrl;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.style.pointerEvents = "none";
        iframe.setAttribute("allow", "autoplay; encrypted-media");
        div.appendChild(iframe);
      } else if (info.shapeType === "circle") {
        div.style.background = "white";
        div.style.borderRadius = "50%";
      } else if (info.shapeType === "triangle") {
        div.style.width = "0";
        div.style.height = "0";
        div.style.borderLeft = "50px solid transparent";
        div.style.borderRight = "50px solid transparent";
        div.style.borderBottom = "100px solid white";
        div.style.background = "transparent";
      } else {
        div.style.background = "white";
      }
      workspace.appendChild(div);
      baseMLMap2.addLayer(div);
      managedLayers.push(info);
    }
    function assignVideoToLayer(layerId, url, name) {
      const ml = managedLayers.find((l) => l.id === layerId);
      if (!ml || ml.type !== "video") return;
      const div = document.getElementById(layerId);
      if (!div) return;
      div.innerHTML = "";
      div.style.background = "#000";
      const video = document.createElement("video");
      video.src = url;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "contain";
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      div.appendChild(video);
      videoCtrl.registerVideoElement(video);
      ml.name = name;
      ml.videoUrl = url;
      saveManagedLayers();
      renderLayerList();
      if (managedLayers.some((l) => l.clipTo === layerId)) {
        video.play().catch(() => {
        });
        updateClipMaskRendererState();
      }
      bridge.send("ADD_LAYER", ml);
      sendVideoDataToDisplay(layerId, url);
      setTimeout(() => bridge.send("UPDATE_LAYOUT", { layout: baseMLMap2.getLayout() }), 100);
    }
    function assignCaptureToLayer(layerId, stream, name) {
      const ml = managedLayers.find((l) => l.id === layerId);
      if (!ml || ml.type !== "video") return;
      const div = document.getElementById(layerId);
      if (!div) return;
      div.innerHTML = "";
      div.style.background = "#000";
      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "contain";
      video.muted = true;
      video.playsInline = true;
      div.appendChild(video);
      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (stream.getTracks().every((t) => t.readyState === "ended")) {
            video.srcObject = null;
            div.innerHTML = "";
            const ph = document.createElement("div");
            ph.className = "mlmap-video-placeholder";
            ph.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;";
            ph.innerHTML = `<span style="font-size:18px;color:#555;">&#9632;</span><span style="font-size:10px;color:#555;margin-top:2px;">${name}</span><span style="font-size:9px;color:#444;margin-top:2px;">Capture ended</span>`;
            div.appendChild(ph);
            renderLayerList();
          }
        });
      });
      videoCtrl.registerVideoElement(video);
      ml.name = name;
      ml.videoUrl = void 0;
      saveManagedLayers();
      renderLayerList();
      if (managedLayers.some((l) => l.clipTo === layerId)) {
        updateClipMaskRendererState();
      }
      bridge.send("ADD_LAYER", ml);
      setTimeout(() => bridge.send("UPDATE_LAYOUT", { layout: baseMLMap2.getLayout() }), 100);
    }
    document.getElementById("lp-addSquare").addEventListener("click", () => createShape("square"));
    document.getElementById("lp-addCircle").addEventListener("click", () => createShape("circle"));
    document.getElementById("lp-addTriangle").addEventListener("click", () => createShape("triangle"));
    document.getElementById("lp-addIframe").addEventListener("click", () => {
      const url = prompt("Enter URL for iframe:", "https://");
      if (url && url !== "https://") createIframeLayer(url);
    });
    const snapCheckbox = document.getElementById("lp-snap");
    snapCheckbox.checked = baseMLMap2.snapEnabled;
    snapCheckbox.addEventListener("change", () => {
      baseMLMap2.snapEnabled = snapCheckbox.checked;
    });
    baseMLMap2.onSnapChanged = (enabled) => {
      snapCheckbox.checked = enabled;
    };
    function showContextMenu(x, y, layer) {
      baseMLMap2.selectLayer(layer);
      const layerId = layer.element.id;
      const ml = managedLayers.find((l) => l.id === layerId);
      const isShape = ml?.type === "shape";
      const isVideo = ml?.type === "video";
      const isClipped = !!ml?.clipTo;
      let clipLabel = "";
      const hasVideoLayer = managedLayers.some((l) => l.type === "video");
      if (isShape && !isClipped && hasVideoLayer) clipLabel = "Create Clip Mask";
      else if (isClipped) clipLabel = "Release Clip Mask";
      ctxMenu.innerHTML = `
            <div class="ctx-item" data-action="center">Center on screen</div>
            <div class="ctx-sep"></div>
            ${isVideo ? `
            <div class="ctx-has-sub">
                <div class="ctx-item" style="color:#5af;">Assign Video<span class="ctx-arrow">\u25B6</span></div>
                <div class="ctx-submenu">
                    <div class="ctx-item" data-action="assignFile">Browse file...</div>
                    <div class="ctx-item" data-action="assignUrl">Enter URL...</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="assignCapture">Screen capture...</div>
                    <div class="ctx-item" data-action="assignWebcam">Webcam...</div>
                </div>
            </div>
            <div class="ctx-sep"></div>` : ""}
            <div class="ctx-has-sub">
                <div class="ctx-item">Layer Order<span class="ctx-arrow">\u25B6</span></div>
                <div class="ctx-submenu">
                    <div class="ctx-item" data-action="moveUp">Move Up</div>
                    <div class="ctx-item" data-action="moveDown">Move Down</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="sendToTop">Send to Top</div>
                    <div class="ctx-item" data-action="sendToBottom">Send to Bottom</div>
                </div>
            </div>
            <div class="ctx-has-sub">
                <div class="ctx-item">Transform<span class="ctx-arrow">\u25B6</span></div>
                <div class="ctx-submenu">
                    <div class="ctx-item" data-action="rotate90">Rotate 90\xB0</div>
                    <div class="ctx-item" data-action="rotate180">Rotate 180\xB0</div>
                    <div class="ctx-item" data-action="rotate270">Rotate 270\xB0</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="flipH">Flip Horizontal</div>
                    <div class="ctx-item" data-action="flipV">Flip Vertical</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="scaleUp">Scale +10%</div>
                    <div class="ctx-item" data-action="scaleDown">Scale -10%</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="resetTransform">Reset Transform</div>
                </div>
            </div>
            <div class="ctx-sep"></div>
            ${clipLabel ? `<div class="ctx-item" data-action="toggleClip">${clipLabel}</div><div class="ctx-sep"></div>` : ""}
            <div class="ctx-item" data-action="solo">Solo / Unsolo<span class="shortcut">S</span></div>
            <div class="ctx-item" data-action="delete" style="color:#f55;">Delete layer<span class="shortcut">DEL</span></div>
        `;
      const menuW = 200, menuH = 300;
      const posX = x + menuW > window.innerWidth ? x - menuW : x;
      const posY = y + menuH > window.innerHeight ? y - menuH : y;
      ctxMenu.style.left = Math.max(0, posX) + "px";
      ctxMenu.style.top = Math.max(0, posY) + "px";
      ctxMenu.style.display = "block";
      ctxMenu.querySelectorAll(".ctx-item[data-action]").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const action = item.dataset.action;
          switch (action) {
            case "center":
              baseMLMap2.centerLayer(layer);
              break;
            case "moveUp":
              baseMLMap2.moveLayerUp(layer);
              syncManagedLayerOrder();
              break;
            case "moveDown":
              baseMLMap2.moveLayerDown(layer);
              syncManagedLayerOrder();
              break;
            case "sendToTop":
              baseMLMap2.moveLayerToTop(layer);
              syncManagedLayerOrder();
              break;
            case "sendToBottom":
              baseMLMap2.moveLayerToBottom(layer);
              syncManagedLayerOrder();
              break;
            case "rotate90":
              baseMLMap2.rotateLayerPublic(layer, 90);
              break;
            case "rotate180":
              baseMLMap2.rotateLayerPublic(layer, 180);
              break;
            case "rotate270":
              baseMLMap2.rotateLayerPublic(layer, 270);
              break;
            case "flipH":
              baseMLMap2.flipLayerH(layer);
              break;
            case "flipV":
              baseMLMap2.flipLayerV(layer);
              break;
            case "scaleUp":
              baseMLMap2.scaleLayerPublic(layer, 1.1);
              break;
            case "scaleDown":
              baseMLMap2.scaleLayerPublic(layer, 0.9);
              break;
            case "resetTransform":
              baseMLMap2.resetLayerTransform(layer);
              break;
            case "toggleClip":
              if (isClipped) releaseClipMask(layerId);
              else createClipMask(layerId);
              break;
            case "assignFile": {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "video/*";
              input.onchange = () => {
                const file = input.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  assignVideoToLayer(layerId, url, file.name);
                }
              };
              input.click();
              break;
            }
            case "assignUrl": {
              const url = prompt("Enter video URL:", "https://");
              if (url && url !== "https://") {
                const urlName = url.split("/").pop() || "Video URL";
                assignVideoToLayer(layerId, url, urlName);
              }
              break;
            }
            case "assignCapture": {
              (async () => {
                try {
                  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                  const track = stream.getVideoTracks()[0];
                  const capName = track?.label || "Screen Capture";
                  assignCaptureToLayer(layerId, stream, capName);
                } catch {
                }
              })();
              break;
            }
            case "assignWebcam": {
              (async () => {
                try {
                  const devices = await navigator.mediaDevices.enumerateDevices();
                  const cameras = devices.filter((d) => d.kind === "videoinput");
                  let constraints = { video: true, audio: true };
                  if (cameras.length > 1) {
                    const options = cameras.map((c, i) => `${i + 1}. ${c.label || `Camera ${i + 1}`}`).join("\n");
                    const choice = prompt(`Select camera:
${options}`, "1");
                    if (!choice) return;
                    const idx = parseInt(choice) - 1;
                    if (idx >= 0 && idx < cameras.length) {
                      constraints = { video: { deviceId: { exact: cameras[idx].deviceId } }, audio: true };
                    }
                  }
                  const stream = await navigator.mediaDevices.getUserMedia(constraints);
                  const track = stream.getVideoTracks()[0];
                  const camName = track?.label || "Webcam";
                  assignCaptureToLayer(layerId, stream, camName);
                } catch {
                }
              })();
              break;
            }
            case "solo":
              const allLayers = baseMLMap2.getLayers();
              const isSoloed = allLayers.some((l) => !l.visible);
              if (isSoloed) {
                allLayers.forEach((l) => l.visible = true);
              } else {
                allLayers.forEach((l) => l.visible = false);
                layer.visible = true;
              }
              break;
            case "delete":
              deleteLayer(layerId);
              break;
          }
          hideContextMenu();
        });
      });
    }
    function hideContextMenu() {
      ctxMenu.style.display = "none";
    }
    document.addEventListener("contextmenu", (e) => {
      const target = e.target;
      if (target.closest("#mlmap-app") || target.closest("#mlmap-context-menu")) return;
      const layer = baseMLMap2.getLayerAtPoint(e.clientX, e.clientY);
      if (layer) {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, layer);
      }
    });
    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest("#mlmap-context-menu")) {
        hideContextMenu();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideContextMenu();
    });
    let workspaces = loadAllWorkspaces();
    let activeWorkspace = workspaces.find(
      (ws) => ws.id === localStorage.getItem("mlmap:currentWorkspaceId")
    ) || null;
    if (!activeWorkspace && workspaces.length) {
      activeWorkspace = workspaces[0];
      localStorage.setItem("mlmap:currentWorkspaceId", activeWorkspace.id);
    }
    function updateWorkspaceSelector() {
      const sel = document.getElementById("lp-wsSelect");
      sel.innerHTML = "";
      workspaces.forEach((ws) => {
        const opt = document.createElement("option");
        opt.value = ws.id;
        opt.textContent = ws.name;
        if (activeWorkspace && activeWorkspace.id === ws.id) opt.selected = true;
        sel.appendChild(opt);
      });
    }
    function switchWorkspace(ws) {
      localStorage.setItem("mlmap:currentWorkspaceId", ws.id);
      window.location.reload();
    }
    document.getElementById("lp-wsAdd").addEventListener("click", () => {
      const name = prompt("Workspace name:", "New Workspace") || "New Workspace";
      const ws = { id: Date.now().toString(), name, version: "1.0", layout: {} };
      workspaces.push(ws);
      saveWorkspace(ws);
      switchWorkspace(ws);
    });
    document.getElementById("lp-wsDup").addEventListener("click", () => {
      if (!activeWorkspace) return;
      const name = prompt("New name:", activeWorkspace.name + " (Copy)") || activeWorkspace.name + " (Copy)";
      const ws = { id: Date.now().toString(), name, version: "1.0", layout: activeWorkspace.layout };
      workspaces.push(ws);
      saveWorkspace(ws);
      switchWorkspace(ws);
    });
    document.getElementById("lp-wsRen").addEventListener("click", () => {
      if (!activeWorkspace) return;
      const name = prompt("New name:", activeWorkspace.name);
      if (name) {
        activeWorkspace.name = name;
        saveWorkspace(activeWorkspace);
        updateWorkspaceSelector();
      }
    });
    document.getElementById("lp-wsReset").addEventListener("click", () => {
      if (!activeWorkspace) return;
      if (confirm("Reset workspace? This will clear all layer positions.")) {
        resetWorkspace(activeWorkspace.id);
        window.location.reload();
      }
    });
    document.getElementById("lp-wsDel").addEventListener("click", () => {
      if (!activeWorkspace || workspaces.length <= 1) return;
      if (confirm("Delete workspace '" + activeWorkspace.name + "'?")) {
        deleteWorkspace(activeWorkspace.id);
        workspaces = workspaces.filter((ws) => ws.id !== activeWorkspace?.id);
        if (workspaces.length) switchWorkspace(workspaces[0]);
      }
    });
    document.getElementById("lp-wsSelect").addEventListener("change", (e) => {
      const ws = workspaces.find((w) => w.id === e.target.value);
      if (ws) switchWorkspace(ws);
    });
    updateWorkspaceSelector();
    document.getElementById("lp-wfExport").addEventListener("click", () => {
      const data = exportWorkflow(activeWorkspace?.name);
      downloadWorkflow(data);
    });
    document.getElementById("lp-wfImport").addEventListener("click", async () => {
      const data = await uploadWorkflow();
      if (data) {
        importWorkflow(data);
        window.location.reload();
      }
    });
    document.getElementById("lp-wfShare").addEventListener("click", () => {
      const data = exportWorkflow(activeWorkspace?.name);
      const url = generateShareUrl(data);
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById("lp-wfShare");
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        btn.style.background = "#4CAF50";
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.background = "";
        }, 2e3);
      }).catch(() => {
        prompt("Share URL (copy manually):", url);
      });
    });
    const launchBtn = document.getElementById("tb-launch");
    function updateLaunchButton() {
      if (displayWindow && !displayWindow.closed) {
        launchBtn.textContent = "Stop Output";
        launchBtn.classList.remove("mlmap-btn-primary");
        launchBtn.style.background = "#a33";
      } else {
        launchBtn.textContent = "Launch Output";
        launchBtn.classList.add("mlmap-btn-primary");
        launchBtn.style.background = "";
        displayWindow = null;
      }
    }
    launchBtn.addEventListener("click", () => {
      if (displayWindow && !displayWindow.closed) {
        displayWindow.close();
        displayWindow = null;
        updateLaunchButton();
        return;
      }
      const monitorSel = document.getElementById("tb-monitor");
      const screenIdx = parseInt(monitorSel.value);
      let features = "width=1280,height=720";
      if (!isNaN(screenIdx) && window._mlmapScreens && window._mlmapScreens[screenIdx]) {
        const s = window._mlmapScreens[screenIdx];
        features = `left=${s.availLeft},top=${s.availTop},width=${s.availWidth},height=${s.availHeight}`;
      }
      displayWindow = window.open(DISPLAY_URL, "mlmap-display", features);
      updateLaunchButton();
      const checkClosed = setInterval(() => {
        if (!displayWindow || displayWindow.closed) {
          clearInterval(checkClosed);
          displayWindow = null;
          updateLaunchButton();
        }
      }, 1e3);
    });
    document.getElementById("tb-fullscreen").addEventListener("click", () => {
      bridge.send("FULLSCREEN_ENTER");
    });
    bridge.onConnectionChanged = (connected) => {
      const dot = document.getElementById("tb-status");
      dot.className = connected ? "status-dot connected" : "status-dot disconnected";
      dot.title = connected ? "Display connected" : "Display disconnected";
    };
    bridge.on("DISPLAY_READY", () => {
      managedLayers.forEach((layer) => bridge.send("ADD_LAYER", layer));
      setTimeout(() => {
        bridge.send("UPDATE_LAYOUT", { layout: baseMLMap2.getLayout() });
        videoCtrl.sendPlaylistToDisplay();
        managedLayers.forEach((layer) => {
          if (layer.type === "video") {
            const el = document.getElementById(layer.id);
            const video = el?.querySelector("video");
            if (video && video.src && video.src.startsWith("blob:")) {
              sendVideoDataToDisplay(layer.id, video.src);
            }
          }
        });
        setTimeout(() => videoCtrl.syncPlaybackToDisplay(), 500);
      }, 200);
    });
    async function detectMonitors() {
      const sel = document.getElementById("tb-monitor");
      try {
        if ("getScreenDetails" in window) {
          const screenDetails = await window.getScreenDetails();
          window._mlmapScreens = screenDetails.screens;
          sel.innerHTML = '<option value="">Select monitor...</option>';
          screenDetails.screens.forEach((screen2, i) => {
            const opt = document.createElement("option");
            opt.value = String(i);
            const label = screen2.label || `Monitor ${i + 1}`;
            opt.textContent = `${label} (${screen2.width}x${screen2.height})`;
            if (!screen2.isPrimary) opt.textContent += " *";
            sel.appendChild(opt);
          });
        } else {
          sel.innerHTML = `<option value="">Default (${screen.width}x${screen.height})</option>`;
        }
      } catch {
        sel.innerHTML = `<option value="">Default (${screen.width}x${screen.height})</option>`;
      }
    }
    detectMonitors();
    let leftVisible = true;
    let rightVisible = true;
    function updatePanelLayout() {
      const leftCol = leftVisible ? "210px" : "0px";
      const rightCol = rightVisible ? "270px" : "0px";
      app.style.gridTemplateColumns = `${leftCol} 1fr ${rightCol}`;
      leftPanel.style.display = leftVisible ? "flex" : "none";
      rightPanel.style.display = rightVisible ? "flex" : "none";
      document.getElementById("tb-toggleLeft").innerHTML = leftVisible ? "&laquo;" : "&raquo;";
      document.getElementById("tb-toggleRight").innerHTML = rightVisible ? "&raquo;" : "&laquo;";
    }
    document.getElementById("tb-toggleLeft").addEventListener("click", () => {
      leftVisible = !leftVisible;
      updatePanelLayout();
    });
    document.getElementById("tb-toggleRight").addEventListener("click", () => {
      rightVisible = !rightVisible;
      updatePanelLayout();
    });
    const zoomSlider = document.getElementById("tb-zoom");
    const zoomLabel = document.getElementById("tb-zoomLabel");
    zoomSlider.addEventListener("input", () => {
      const zoom = parseInt(zoomSlider.value) / 100;
      workspace.style.transform = zoom < 1 ? `scale(${zoom})` : "";
      zoomLabel.textContent = `${zoomSlider.value}%`;
      baseMLMap2.setWorkspaceZoom(zoom);
      clipMaskRenderer.zoom = zoom;
    });
    document.body.appendChild(clipMaskRenderer.canvasElement);
    const originalSetConfigEnabled = baseMLMap2.setConfigEnabled;
    baseMLMap2.setConfigEnabled = function(enabled) {
      originalSetConfigEnabled.call(baseMLMap2, enabled);
      app.style.display = enabled ? "grid" : "none";
      if (!enabled) reapplyClipMaskVisibility();
    };
    function reapplyClipMaskVisibility() {
      const hiddenBases = /* @__PURE__ */ new Set();
      for (const ml of managedLayers) {
        if (!ml.clipTo) continue;
        const maskEl = document.getElementById(ml.id);
        if (maskEl) maskEl.style.opacity = "0";
        hiddenBases.add(ml.clipTo);
      }
      for (const baseId of hiddenBases) {
        const baseEl = document.getElementById(baseId);
        if (baseEl) baseEl.style.opacity = "0";
      }
    }
    baseMLMap2.onAfterDraw = reapplyClipMaskVisibility;
    baseMLMap2.layoutChangeListener = () => {
      if (activeWorkspace) {
        activeWorkspace.layout = baseMLMap2.getLayout();
        saveWorkspace(activeWorkspace);
      }
      bridge.send("UPDATE_LAYOUT", { layout: baseMLMap2.getLayout() });
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        videoCtrl.syncPlaybackToDisplay();
      }
    });
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement && !node.isConnected) {
              const idx = managedLayers.findIndex((l) => l.id === node.id);
              if (idx !== -1) {
                managedLayers.splice(idx, 1);
                saveManagedLayers();
                renderLayerList();
                bridge.send("REMOVE_LAYER", { id: node.id });
              }
            }
          });
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    loadManagedLayers();
    if (activeWorkspace?.layout) {
      baseMLMap2.setLayout(activeWorkspace.layout);
    }
    reapplyClipMaskVisibility();
    updateClipMaskRendererState();
    leftPanel.addEventListener("keydown", (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") e.stopPropagation();
    });
    checkLatestVersion().then((v) => {
      if (v.latest !== VERSION) {
        const titleEl = app.querySelector(".app-title");
        if (titleEl) titleEl.setAttribute("title", `Update available: v${v.latest}`);
      }
    });
  }

  // src/main.ts
  init_data();
  var MLMap = class {
    constructor(config = {}) {
      this.onAfterDraw = null;
      this.layers = [];
      this.configActive = false;
      this.dragging = false;
      this.dragOffset = [0, 0];
      this.selectedLayer = null;
      this.selectedLayers = [];
      this.selectedPoint = null;
      this.selectionRadius = 20;
      this.hoveringPoint = null;
      this.hoveringLayer = null;
      this.isLayerSoloed = false;
      this.snapEnabled = true;
      this.onSnapChanged = null;
      this.SNAP_THRESHOLD = 12;
      this.workspaceZoom = 1;
      // Rubber band selection state
      this.rubberBandActive = false;
      this.rubberBandStart = [0, 0];
      this.rubberBandEnd = [0, 0];
      this.rubberBandBaseSelection = [];
      this.mousePosition = [0, 0];
      this.mouseDelta = [0, 0];
      this.mouseDownPoint = [0, 0];
      this.keyDown = this.keyDown.bind(this);
      this.setConfigEnabled = this.setConfigEnabled.bind(this);
      this.showLayerNames = this.getProp(config, "labels", true);
      this.showCrosshairs = this.getProp(config, "crosshairs", false);
      this.showScreenBounds = this.getProp(config, "screenbounds", false);
      this.autoSave = this.getProp(config, "autoSave", true);
      this.autoLoad = this.getProp(config, "autoLoad", true);
      this.layerList = this.getProp(config, "layers", []);
      this.layoutChangeListener = this.getProp(config, "onchange", () => {
      });
      this.canvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d");
      this.initCanvas();
      this.loadSettings();
      for (let item of this.layerList) {
        if (item instanceof HTMLElement || typeof item === "string") this.addLayer(item);
      }
      if (this.autoLoad) this.loadSettings();
      this.pushHistory();
      const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node.isConnected) return;
            this.layers.forEach((layer, i) => {
              if (layer.element === node) {
                if (layer.overlay) layer.overlay.remove();
                this.layers.splice(i, 1);
              }
            });
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    // ---------------- Internal Methods ----------------
    getProp(cfg, key, defaultVal) {
      return cfg && cfg.hasOwnProperty(key) && cfg[key] !== null ? cfg[key] : defaultVal;
    }
    initCanvas() {
      this.canvas.style.display = "none";
      this.canvas.style.position = "fixed";
      this.canvas.style.top = "0px";
      this.canvas.style.left = "0px";
      this.canvas.style.zIndex = "1000000";
      this.context = this.canvas.getContext("2d");
      document.body.appendChild(this.canvas);
      window.addEventListener("resize", this.resize.bind(this));
      window.addEventListener("mousemove", this.mouseMove.bind(this));
      window.addEventListener("mouseup", this.mouseUp.bind(this));
      window.addEventListener("mousedown", this.mouseDown.bind(this));
      window.addEventListener("keydown", this.keyDown.bind(this));
      this.resize();
    }
    pushHistory() {
      const snapshot = this.getLayout();
      historyStack.push(JSON.stringify(snapshot));
      if (historyStack.length > historyLimit) historyStack.shift();
      redoStack.length = 0;
    }
    saveSettings() {
      const data = loadWorkspace();
      saveWorkspace({
        id: data?.id,
        name: data?.name,
        version: data?.version,
        layout: this.getLayout()
      });
    }
    loadSettings() {
      try {
        const data = loadWorkspace();
        if (data?.version === "1.0" && data?.layout) this.setLayout(data.layout);
        else console.warn("MLMap: localStorage version mismatch, skipping load.");
      } catch (e) {
        console.error("MLMap: Failed to parse layout from localStorage.", e);
      }
    }
    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.draw();
    }
    pointInTriangle(p, a, b, c) {
      let s = a[1] * c[0] - a[0] * c[1] + (c[1] - a[1]) * p[0] + (a[0] - c[0]) * p[1];
      let t = a[0] * b[1] - a[1] * b[0] + (a[1] - b[1]) * p[0] + (b[0] - a[0]) * p[1];
      if (s < 0 !== t < 0) return false;
      let A = -b[1] * c[0] + a[1] * (c[0] - b[0]) + a[0] * (b[1] - c[1]) + b[0] * c[1];
      if (A < 0) {
        s = -s;
        t = -t;
        A = -A;
      }
      return s > 0 && t > 0 && s + t < A;
    }
    pointInLayer(point, layer) {
      const [a, b, c, d] = layer.targetPoints;
      return this.pointInTriangle(point, a, b, c) || this.pointInTriangle(point, d, a, c);
    }
    updateTransform() {
      const prefixes = ["", "-webkit-", "-moz-", "-ms-", "-o-"];
      let transformProp = "transform";
      for (const pre of prefixes) {
        const candidate = pre + "transform";
        if (candidate in document.body.style) {
          transformProp = candidate;
          break;
        }
      }
      for (let l = 0; l < this.layers.length; l++) {
        const a = [];
        const b = [];
        for (let i = 0, n = this.layers[l].sourcePoints.length; i < n; ++i) {
          const s = this.layers[l].sourcePoints[i];
          const t = this.layers[l].targetPoints[i];
          a.push([s[0], s[1], 1, 0, 0, 0, -s[0] * t[0], -s[1] * t[0]]);
          b.push(t[0]);
          a.push([0, 0, 0, s[0], s[1], 1, -s[0] * t[1], -s[1] * t[1]]);
          b.push(t[1]);
        }
        const X = solve(a, b, true);
        const matrix = [
          X[0],
          X[3],
          0,
          X[6],
          X[1],
          X[4],
          0,
          X[7],
          0,
          0,
          1,
          0,
          X[2],
          X[5],
          0,
          1
        ];
        const style = this.layers[l].element.style;
        style.setProperty(transformProp, `matrix3d(${matrix.join(",")})`);
        style.setProperty(`${transformProp}-origin`, "0px 0px 0px");
      }
    }
    rotateLayer(layer, angle) {
      var s = Math.sin(angle);
      var c = Math.cos(angle);
      var centerPoint = [0, 0];
      for (var p = 0; p < layer.targetPoints.length; p++) {
        centerPoint[0] += layer.targetPoints[p][0];
        centerPoint[1] += layer.targetPoints[p][1];
      }
      centerPoint[0] /= 4;
      centerPoint[1] /= 4;
      for (var p = 0; p < layer.targetPoints.length; p++) {
        var px = layer.targetPoints[p][0] - centerPoint[0];
        var py = layer.targetPoints[p][1] - centerPoint[1];
        layer.targetPoints[p][0] = px * c - py * s + centerPoint[0];
        layer.targetPoints[p][1] = px * s + py * c + centerPoint[1];
      }
    }
    scaleLayer(layer, scale) {
      var centerPoint = [0, 0];
      for (var p = 0; p < layer.targetPoints.length; p++) {
        centerPoint[0] += layer.targetPoints[p][0];
        centerPoint[1] += layer.targetPoints[p][1];
      }
      centerPoint[0] /= 4;
      centerPoint[1] /= 4;
      for (var p = 0; p < layer.targetPoints.length; p++) {
        var px = layer.targetPoints[p][0] - centerPoint[0];
        var py = layer.targetPoints[p][1] - centerPoint[1];
        layer.targetPoints[p][0] = px * scale + centerPoint[0];
        layer.targetPoints[p][1] = py * scale + centerPoint[1];
      }
    }
    undo() {
      if (historyStack.length > 1) {
        redoStack.push(historyStack.pop());
        var last = JSON.parse(historyStack[historyStack.length - 1]);
        this.setLayout(last);
        this.draw();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
      }
    }
    redo() {
      if (redoStack.length > 0) {
        const state = redoStack.pop();
        historyStack.push(state);
        this.setLayout(JSON.parse(state));
        this.draw();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
      }
    }
    swapLayerPoints(layerPoints, index1, index2) {
      var tx = layerPoints[index1][0];
      var ty = layerPoints[index1][1];
      layerPoints[index1][0] = layerPoints[index2][0];
      layerPoints[index1][1] = layerPoints[index2][1];
      layerPoints[index2][0] = tx;
      layerPoints[index2][1] = ty;
    }
    // ---------------- Public API ----------------
    addLayer(target, targetPoints) {
      let element = null;
      if (typeof target === "string") {
        element = document.getElementById(target);
        if (!element) throw new Error("MLMap: No element found with id: " + target);
      } else if (target instanceof HTMLElement) element = target;
      else throw new Error("MLMap: Invalid target");
      for (let n = 0; n < this.layers.length; n++) {
        if (this.layers[n].element.id === element.id) {
          if (targetPoints) this.layers[n].targetPoints = clonePoints(targetPoints);
          return;
        }
      }
      element.style.position = "fixed";
      element.style.display = "block";
      element.style.top = "0px";
      element.style.left = "0px";
      element.style.padding = "0px";
      element.style.margin = "0px";
      const layer = {
        visible: true,
        element,
        width: element.clientWidth,
        height: element.clientHeight,
        sourcePoints: [
          [0, 0],
          [element.clientWidth, 0],
          [element.clientWidth, element.clientHeight],
          [0, element.clientHeight]
        ],
        targetPoints: []
      };
      if (targetPoints) layer.targetPoints = clonePoints(targetPoints);
      else {
        const [x, y] = getFreePosition(layer.width, layer.height, this.layers);
        layer.targetPoints = [
          [x, y],
          [x + layer.width, y],
          [x + layer.width, y + layer.height],
          [x, y + layer.height]
        ];
      }
      this.layers.push(layer);
      element.parentElement?.appendChild(element);
      this.updateTransform();
    }
    removeLayer(target) {
      const element = typeof target === "string" ? document.getElementById(target) : target;
      if (!element) return;
      for (let i = this.layers.length - 1; i >= 0; i--) {
        if (this.layers[i].element === element) {
          if (this.layers[i].overlay) this.layers[i].overlay?.remove();
          this.layers.splice(i, 1);
        }
      }
      this.updateTransform();
    }
    setLayout(layout) {
      for (var i = 0; i < layout.length; i++) {
        var exists = false;
        for (var n = 0; n < this.layers.length; n++) {
          if (this.layers[n].element.id == layout[i].id) {
            console.log("Setting points.");
            this.layers[n].targetPoints = clonePoints(layout[i].targetPoints);
            this.layers[n].sourcePoints = clonePoints(layout[i].sourcePoints);
            exists = true;
          }
        }
        if (!exists) {
          var element = document.getElementById(layout[i].id);
          if (element) this.addLayer(element, layout[i].targetPoints);
          else console.log(`MLMap: Can"t find element: ` + layout[i].id);
        } else console.log(`MLMap: Element "" + layout[i].id + "" is already mapped.`);
      }
      this.updateTransform();
      this.draw();
    }
    getLayout() {
      var layout = [];
      for (var i = 0; i < this.layers.length; i++) {
        layout.push({
          "id": this.layers[i].element.id,
          "targetPoints": clonePoints(this.layers[i].targetPoints),
          "sourcePoints": clonePoints(this.layers[i].sourcePoints)
        });
      }
      return layout;
    }
    setConfigEnabled(enabled) {
      this.configActive = enabled;
      this.canvas.style.display = enabled ? "block" : "none";
      if (!enabled) {
        this.selectedPoint = null;
        this.selectedLayer = null;
        this.selectedLayers = [];
        this.dragging = false;
        this.rubberBandActive = false;
        this.showScreenBounds = false;
      } else this.draw();
    }
    // ---- Context menu helpers ----
    getSelectedLayer() {
      return this.selectedLayer;
    }
    getLayers() {
      return this.layers;
    }
    getLayerAtPoint(x, y) {
      const [wx, wy] = this.toWorkspace(x, y);
      for (let i = this.layers.length - 1; i >= 0; i--) {
        const layer = this.layers[i];
        if (!layer.visible) continue;
        if (this.pointInLayer([wx, wy], layer)) return layer;
      }
      return null;
    }
    selectLayer(layer) {
      this.selectedLayer = layer;
      this.selectedLayers = layer ? [layer] : [];
      this.selectedPoint = null;
      this.draw();
    }
    getSelectedLayers() {
      return [...this.selectedLayers];
    }
    centerLayer(layer) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      let lcx = 0, lcy = 0;
      for (const p of layer.targetPoints) {
        lcx += p[0];
        lcy += p[1];
      }
      lcx /= 4;
      lcy /= 4;
      const dx = cx - lcx, dy = cy - lcy;
      for (const p of layer.targetPoints) {
        p[0] += dx;
        p[1] += dy;
      }
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    rotateLayerPublic(layer, angleDeg) {
      this.rotateLayer(layer, angleDeg * Math.PI / 180);
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    flipLayerH(layer) {
      this.swapLayerPoints(layer.sourcePoints, 0, 1);
      this.swapLayerPoints(layer.sourcePoints, 3, 2);
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    flipLayerV(layer) {
      this.swapLayerPoints(layer.sourcePoints, 0, 3);
      this.swapLayerPoints(layer.sourcePoints, 1, 2);
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    deleteSelectedLayer(layer) {
      layer.element.remove();
      if (layer.overlay) layer.overlay.remove();
      const index = this.layers.indexOf(layer);
      if (index >= 0) this.layers.splice(index, 1);
      if (this.selectedLayer === layer) this.selectedLayer = null;
      const selIdx = this.selectedLayers.indexOf(layer);
      if (selIdx >= 0) this.selectedLayers.splice(selIdx, 1);
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    scaleLayerPublic(layer, scale) {
      this.scaleLayer(layer, scale);
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    // ---- Layer ordering ----
    moveLayerUp(layer) {
      const idx = this.layers.indexOf(layer);
      if (idx < 0 || idx >= this.layers.length - 1) return;
      this.layers[idx] = this.layers[idx + 1];
      this.layers[idx + 1] = layer;
      this.reorderLayerDOM();
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    moveLayerDown(layer) {
      const idx = this.layers.indexOf(layer);
      if (idx <= 0) return;
      this.layers[idx] = this.layers[idx - 1];
      this.layers[idx - 1] = layer;
      this.reorderLayerDOM();
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    moveLayerToTop(layer) {
      const idx = this.layers.indexOf(layer);
      if (idx < 0 || idx === this.layers.length - 1) return;
      this.layers.splice(idx, 1);
      this.layers.push(layer);
      this.reorderLayerDOM();
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    moveLayerToBottom(layer) {
      const idx = this.layers.indexOf(layer);
      if (idx <= 0) return;
      this.layers.splice(idx, 1);
      this.layers.unshift(layer);
      this.reorderLayerDOM();
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    reorderLayerDOM() {
      for (const layer of this.layers) {
        layer.element.parentElement?.appendChild(layer.element);
      }
    }
    resetLayerTransform(layer) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const hw = layer.width / 2, hh = layer.height / 2;
      layer.targetPoints = [
        [cx - hw, cy - hh],
        [cx + hw, cy - hh],
        [cx + hw, cy + hh],
        [cx - hw, cy + hh]
      ];
      layer.sourcePoints = [
        [0, 0],
        [layer.width, 0],
        [layer.width, layer.height],
        [0, layer.height]
      ];
      this.updateTransform();
      this.draw();
      this.pushHistory();
      if (this.autoSave) this.saveSettings();
      this.layoutChangeListener();
    }
    // ---------------- Utils ----------------
    layerIntersectsRect(layer, x1, y1, x2, y2) {
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      const rx2 = Math.max(x1, x2), ry2 = Math.max(y1, y2);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of layer.targetPoints) {
        if (p[0] < minX) minX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] > maxY) maxY = p[1];
      }
      return !(maxX < rx || minX > rx2 || maxY < ry || minY > ry2);
    }
    draw() {
      if (!this.configActive) return;
      this.context.strokeStyle = "red";
      this.context.lineWidth = 2;
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.workspaceZoom !== 1) {
        this.context.save();
        const zCx = this.canvas.width / 2;
        const zCy = this.canvas.height / 2;
        this.context.translate(zCx, zCy);
        this.context.scale(this.workspaceZoom, this.workspaceZoom);
        this.context.translate(-zCx, -zCy);
      }
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i];
        if (layer.visible) {
          layer.element.style.visibility = "visible";
          this.context.beginPath();
          if (this.selectedLayers.includes(layer)) this.context.strokeStyle = "red";
          else if (layer === this.hoveringLayer) this.context.strokeStyle = "red";
          else this.context.strokeStyle = "white";
          this.context.moveTo(layer.targetPoints[0][0], layer.targetPoints[0][1]);
          for (let p = 0; p < layer.targetPoints.length; p++) {
            this.context.lineTo(layer.targetPoints[p][0], layer.targetPoints[p][1]);
          }
          this.context.lineTo(layer.targetPoints[3][0], layer.targetPoints[3][1]);
          this.context.closePath();
          this.context.stroke();
          const centerPoint = [0, 0];
          for (let p = 0; p < layer.targetPoints.length; p++) {
            if (layer.targetPoints[p] === this.hoveringPoint) this.context.strokeStyle = "red";
            else if (layer.targetPoints[p] === this.selectedPoint) this.context.strokeStyle = "red";
            else this.context.strokeStyle = "white";
            centerPoint[0] += layer.targetPoints[p][0];
            centerPoint[1] += layer.targetPoints[p][1];
            this.context.beginPath();
            this.context.arc(layer.targetPoints[p][0], layer.targetPoints[p][1], this.selectionRadius / 2, 0, 2 * Math.PI, false);
            this.context.stroke();
          }
          centerPoint[0] /= 4;
          centerPoint[1] /= 4;
          if (this.showLayerNames) {
            const label = layer.element.id.toUpperCase();
            this.context.font = "16px sans-serif";
            this.context.textAlign = "center";
            const metrics = this.context.measureText(label);
            const size = [metrics.width + 8, 16 + 16];
            this.context.fillStyle = "white";
            const marginY = window.innerHeight * 0.01;
            let textX = centerPoint[0];
            let textY = centerPoint[1];
            if (layer.width < metrics.width + 10 || layer.height < 20) {
              textY = centerPoint[1] - layer.height / 2 - 10 - marginY;
              if (textY - size[1] / 2 < marginY) {
                textY = centerPoint[1] + layer.height / 2 + 20 + marginY;
              }
            }
            this.context.fillRect(textX - size[0] / 2, textY - size[1] / 2, size[0], size[1]);
            this.context.fillStyle = "black";
            this.context.font = "14px sans-serif";
            this.context.fillText(label, textX, textY);
          }
        } else layer.element.style.visibility = "hidden";
      }
      if (this.showCrosshairs) {
        this.context.strokeStyle = "yellow";
        this.context.lineWidth = 1;
        this.context.beginPath();
        this.context.moveTo(this.mousePosition[0], 0);
        this.context.lineTo(this.mousePosition[0], this.canvas.height);
        this.context.moveTo(0, this.mousePosition[1]);
        this.context.lineTo(this.canvas.width, this.mousePosition[1]);
        this.context.stroke();
      }
      if (this.showScreenBounds) {
        this.context.fillStyle = "black";
        this.context.lineWidth = 4;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.strokeStyle = "#909090";
        this.context.beginPath();
        const stepX = this.canvas.width / 10;
        const stepY = this.canvas.height / 10;
        for (let i = 0; i < 10; i++) {
          this.context.moveTo(i * stepX, 0);
          this.context.lineTo(i * stepX, this.canvas.height);
          this.context.moveTo(0, i * stepY);
          this.context.lineTo(this.canvas.width, i * stepY);
        }
        this.context.stroke();
        this.context.strokeStyle = "white";
        this.context.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
        const fontSize = Math.round(stepY * 0.6);
        this.context.font = `${fontSize}px mono, sans-serif`;
        this.context.fillRect(stepX * 2 + 2, stepY * 3 + 2, this.canvas.width - stepX * 4 - 4, this.canvas.height - stepY * 6 - 4);
        this.context.fillStyle = "white";
        this.context.font = "20px sans-serif";
        this.context.fillText(`${this.canvas.width} x ${this.canvas.height}`, this.canvas.width / 2, this.canvas.height / 2 + fontSize * 0.75);
        this.context.fillText("Display size", this.canvas.width / 2, this.canvas.height / 2 - fontSize * 0.75);
      }
      if (this.rubberBandActive) {
        const rx = Math.min(this.rubberBandStart[0], this.rubberBandEnd[0]);
        const ry = Math.min(this.rubberBandStart[1], this.rubberBandEnd[1]);
        const rw = Math.abs(this.rubberBandEnd[0] - this.rubberBandStart[0]);
        const rh = Math.abs(this.rubberBandEnd[1] - this.rubberBandStart[1]);
        this.context.strokeStyle = "rgba(51, 153, 255, 0.8)";
        this.context.fillStyle = "rgba(51, 153, 255, 0.1)";
        this.context.lineWidth = 1;
        this.context.fillRect(rx, ry, rw, rh);
        this.context.strokeRect(rx, ry, rw, rh);
      }
      if (this.workspaceZoom !== 1) {
        this.context.restore();
      }
      if (this.onAfterDraw) this.onAfterDraw();
    }
    snapLayerToEdges(layer) {
      if (!this.snapEnabled) return;
      const t = this.SNAP_THRESHOLD;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of layer.targetPoints) {
        if (p[0] < minX) minX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] > maxY) maxY = p[1];
      }
      let snapDx = 0, snapDy = 0;
      let snappedX = false, snappedY = false;
      if (Math.abs(minX) < t) {
        snapDx = -minX;
        snappedX = true;
      } else if (Math.abs(maxX - window.innerWidth) < t) {
        snapDx = window.innerWidth - maxX;
        snappedX = true;
      }
      if (Math.abs(minY) < t) {
        snapDy = -minY;
        snappedY = true;
      } else if (Math.abs(maxY - window.innerHeight) < t) {
        snapDy = window.innerHeight - maxY;
        snappedY = true;
      }
      for (const other of this.layers) {
        if (other === layer || !other.visible) continue;
        let oMinX = Infinity, oMinY = Infinity, oMaxX = -Infinity, oMaxY = -Infinity;
        for (const p of other.targetPoints) {
          if (p[0] < oMinX) oMinX = p[0];
          if (p[1] < oMinY) oMinY = p[1];
          if (p[0] > oMaxX) oMaxX = p[0];
          if (p[1] > oMaxY) oMaxY = p[1];
        }
        if (!snappedX) {
          if (Math.abs(maxX - oMinX) < t) {
            snapDx = oMinX - maxX;
            snappedX = true;
          } else if (Math.abs(minX - oMaxX) < t) {
            snapDx = oMaxX - minX;
            snappedX = true;
          } else if (Math.abs(minX - oMinX) < t) {
            snapDx = oMinX - minX;
            snappedX = true;
          } else if (Math.abs(maxX - oMaxX) < t) {
            snapDx = oMaxX - maxX;
            snappedX = true;
          }
        }
        if (!snappedY) {
          if (Math.abs(maxY - oMinY) < t) {
            snapDy = oMinY - maxY;
            snappedY = true;
          } else if (Math.abs(minY - oMaxY) < t) {
            snapDy = oMaxY - minY;
            snappedY = true;
          } else if (Math.abs(minY - oMinY) < t) {
            snapDy = oMinY - minY;
            snappedY = true;
          } else if (Math.abs(maxY - oMaxY) < t) {
            snapDy = oMaxY - maxY;
            snappedY = true;
          }
        }
        if (snappedX && snappedY) break;
      }
      if (snapDx !== 0 || snapDy !== 0) {
        for (const p of layer.targetPoints) {
          p[0] += snapDx;
          p[1] += snapDy;
        }
      }
    }
    toWorkspace(vx, vy) {
      if (this.workspaceZoom === 1) return [vx, vy];
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      return [
        (vx - cx) / this.workspaceZoom + cx,
        (vy - cy) / this.workspaceZoom + cy
      ];
    }
    setWorkspaceZoom(zoom) {
      this.workspaceZoom = Math.max(0.1, Math.min(1, zoom));
      this.draw();
    }
    mouseMove(event) {
      if (!this.configActive) return;
      if (this.dragging || this.rubberBandActive) event.preventDefault();
      const [wx, wy] = this.toWorkspace(event.clientX, event.clientY);
      this.mouseDelta[0] = wx - this.mousePosition[0];
      this.mouseDelta[1] = wy - this.mousePosition[1];
      this.mousePosition[0] = wx;
      this.mousePosition[1] = wy;
      if (this.rubberBandActive) {
        this.rubberBandEnd = [wx, wy];
        const rbLayers = [];
        for (const layer of this.layers) {
          if (!layer.visible) continue;
          if (this.layerIntersectsRect(
            layer,
            this.rubberBandStart[0],
            this.rubberBandStart[1],
            this.rubberBandEnd[0],
            this.rubberBandEnd[1]
          )) {
            rbLayers.push(layer);
          }
        }
        const merged = [...this.rubberBandBaseSelection];
        for (const l of rbLayers) {
          if (!merged.includes(l)) merged.push(l);
        }
        this.selectedLayers = merged;
        this.selectedLayer = this.selectedLayers[this.selectedLayers.length - 1] || null;
        this.draw();
        return;
      }
      if (this.dragging) {
        const scale = event.shiftKey ? 0.1 : 1;
        if (this.selectedPoint) {
          if (event.shiftKey) this.scaleLayer(this.selectedLayer, 1 + this.mouseDelta[0] * 0.01);
          else {
            this.selectedPoint[0] += this.mouseDelta[0] * scale;
            this.selectedPoint[1] += this.mouseDelta[1] * scale;
          }
        } else if (this.selectedLayers.length > 0) {
          if (event.altKey && this.selectedLayer) {
            this.rotateLayer(this.selectedLayer, this.mouseDelta[0] * (0.01 * scale));
          } else {
            for (const layer of this.selectedLayers) {
              for (let i = 0; i < layer.targetPoints.length; i++) {
                layer.targetPoints[i][0] += this.mouseDelta[0] * scale;
                layer.targetPoints[i][1] += this.mouseDelta[1] * scale;
              }
            }
            if (this.selectedLayer) this.snapLayerToEdges(this.selectedLayer);
          }
        }
        this.updateTransform();
        if (this.autoSave) this.saveSettings();
        this.draw();
        this.layoutChangeListener();
        return;
      }
      this.canvas.style.cursor = "default";
      this.hoveringPoint = null;
      this.hoveringLayer = null;
      for (let i = this.layers.length - 1; i >= 0; i--) {
        const layer = this.layers[i];
        if (!layer.visible) continue;
        for (let p = 0; p < layer.targetPoints.length; p++) {
          const point = layer.targetPoints[p];
          if (distanceTo(point[0], point[1], this.mousePosition[0], this.mousePosition[1]) < this.selectionRadius) {
            this.hoveringPoint = point;
            this.hoveringLayer = layer;
            this.canvas.style.cursor = "pointer";
            break;
          }
        }
        if (this.hoveringPoint) break;
      }
      if (!this.hoveringPoint) {
        for (let i = this.layers.length - 1; i >= 0; i--) {
          const layer = this.layers[i];
          if (!layer.visible) continue;
          if (this.pointInLayer(this.mousePosition, layer)) {
            this.hoveringLayer = layer;
            this.canvas.style.cursor = "pointer";
            break;
          }
        }
      }
      this.draw();
    }
    mouseDown(event) {
      if (!this.configActive) return;
      if (event.button === 2) return;
      const [mdx, mdy] = this.toWorkspace(event.clientX, event.clientY);
      this.mouseDownPoint = [mdx, mdy];
      this.selectedPoint = null;
      this.rubberBandActive = false;
      let clickedLayer = null;
      let clickedPoint = null;
      for (let i = this.layers.length - 1; i >= 0; i--) {
        const layer = this.layers[i];
        if (!layer.visible) continue;
        for (let p = 0; p < layer.targetPoints.length; p++) {
          const point = layer.targetPoints[p];
          if (distanceTo(point[0], point[1], mdx, mdy) < this.selectionRadius) {
            clickedPoint = point;
            clickedLayer = layer;
            break;
          }
        }
        if (clickedLayer) break;
      }
      if (!clickedLayer) {
        for (let i = this.layers.length - 1; i >= 0; i--) {
          const layer = this.layers[i];
          if (!layer.visible) continue;
          if (this.pointInLayer([mdx, mdy], layer)) {
            clickedLayer = layer;
            break;
          }
        }
      }
      if (clickedPoint) {
        this.selectedPoint = clickedPoint;
        this.selectedLayer = clickedLayer;
        this.selectedLayers = [clickedLayer];
        this.dragging = true;
      } else if (clickedLayer) {
        if (event.ctrlKey) {
          const idx = this.selectedLayers.indexOf(clickedLayer);
          if (idx >= 0) {
            this.selectedLayers.splice(idx, 1);
            this.selectedLayer = this.selectedLayers[this.selectedLayers.length - 1] || null;
          } else {
            this.selectedLayers.push(clickedLayer);
            this.selectedLayer = clickedLayer;
          }
          this.dragging = this.selectedLayers.length > 0;
        } else {
          if (this.selectedLayers.includes(clickedLayer)) {
            this.selectedLayer = clickedLayer;
          } else {
            this.selectedLayers = [clickedLayer];
            this.selectedLayer = clickedLayer;
          }
          this.dragging = true;
        }
      } else {
        this.selectedLayer = null;
        this.rubberBandBaseSelection = event.ctrlKey ? [...this.selectedLayers] : [];
        if (!event.ctrlKey) this.selectedLayers = [];
        this.rubberBandActive = true;
        this.rubberBandStart = [mdx, mdy];
        this.rubberBandEnd = [mdx, mdy];
        this.dragging = false;
      }
      this.draw();
    }
    mouseUp(_event) {
      if (!this.configActive) return;
      if (this.rubberBandActive) {
        this.rubberBandActive = false;
        this.draw();
        return;
      }
      if (this.dragging) {
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
      }
      this.dragging = false;
      this.selectedPoint = null;
    }
    keyDown(event) {
      if (!this.configActive) {
        if (event.keyCode == 32 && event.shiftKey) {
          this.setConfigEnabled(true);
          return;
        } else return;
      }
      var key = event.keyCode;
      var increment = event.shiftKey ? 10 : 1;
      var dirty = false;
      var delta = [0, 0];
      console.log(key);
      switch (key) {
        case 32:
          if (event.shiftKey) {
            this.setConfigEnabled(false);
            return;
          }
          break;
        case 37:
          delta[0] -= increment;
          break;
        case 38:
          delta[1] -= increment;
          break;
        case 39:
          delta[0] += increment;
          break;
        case 40:
          delta[1] += increment;
          break;
        case 67:
          this.showCrosshairs = !this.showCrosshairs;
          dirty = true;
          break;
        case 76:
          if (!this.configActive) return;
          this.showLayerNames = !this.showLayerNames;
          dirty = true;
          break;
        case 83:
          if (!this.isLayerSoloed) {
            if (this.selectedLayers.length > 0) {
              for (var i = 0; i < this.layers.length; i++) {
                this.layers[i].visible = false;
              }
              for (const sl of this.selectedLayers) sl.visible = true;
              dirty = true;
              this.isLayerSoloed = true;
            }
          } else {
            for (var i = 0; i < this.layers.length; i++) {
              this.layers[i].visible = true;
            }
            this.isLayerSoloed = false;
            dirty = true;
          }
          break;
        case 71:
          this.snapEnabled = !this.snapEnabled;
          if (this.onSnapChanged) this.onSnapChanged(this.snapEnabled);
          break;
        case 66:
          this.showScreenBounds = !this.showScreenBounds;
          this.draw();
          break;
        case 72:
          if (this.selectedLayer) {
            this.swapLayerPoints(this.selectedLayer.sourcePoints, 0, 1);
            this.swapLayerPoints(this.selectedLayer.sourcePoints, 3, 2);
            this.updateTransform();
            this.draw();
          }
          break;
        case 86:
          if (this.selectedLayer) {
            this.swapLayerPoints(this.selectedLayer.sourcePoints, 0, 3);
            this.swapLayerPoints(this.selectedLayer.sourcePoints, 1, 2);
            this.updateTransform();
            this.draw();
          }
          break;
        case 82:
          if (this.selectedLayer) {
            this.rotateLayer(this.selectedLayer, Math.PI / 2);
            this.updateTransform();
            this.draw();
          }
          break;
        case 90:
          if (event.ctrlKey) {
            event.preventDefault();
            this.undo();
            return;
          }
          break;
        case 89:
          if (event.ctrlKey) {
            event.preventDefault();
            this.redo();
            return;
          }
          break;
        case 46:
        // Delete key
        case 8:
          if (this.selectedLayers.length > 0) {
            for (const layer of [...this.selectedLayers]) {
              layer.element.remove();
              if (layer.overlay) layer.overlay.remove();
              const index = this.layers.indexOf(layer);
              if (index >= 0) this.layers.splice(index, 1);
            }
            this.selectedLayers = [];
            this.selectedLayer = null;
            dirty = true;
            this.updateTransform();
            this.draw();
          }
          break;
      }
      if (!this.showScreenBounds) {
        if (this.selectedPoint) {
          this.selectedPoint[0] += delta[0];
          this.selectedPoint[1] += delta[1];
          dirty = true;
        } else if (this.selectedLayers.length > 0) {
          if (event.altKey == true && this.selectedLayer) {
            this.rotateLayer(this.selectedLayer, delta[0] * 0.01);
            this.scaleLayer(this.selectedLayer, delta[1] * -5e-3 + 1);
          } else {
            for (const layer of this.selectedLayers) {
              for (var i = 0; i < layer.targetPoints.length; i++) {
                layer.targetPoints[i][0] += delta[0];
                layer.targetPoints[i][1] += delta[1];
              }
            }
          }
          dirty = true;
        }
      }
      if (dirty) {
        this.updateTransform();
        this.draw();
        if (this.autoSave) this.saveSettings();
        this.pushHistory();
        this.layoutChangeListener();
      }
    }
  };
  checkUrlForWorkflow();
  var baseMLMap = new MLMap({ layers: [] });
  initUIControls(baseMLMap);
  baseMLMap.setConfigEnabled(true);
  window.MLMap = MLMap;
})();
//# sourceMappingURL=mlmap.js.map
