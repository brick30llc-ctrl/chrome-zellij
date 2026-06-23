// background.js — chrome_zellij service worker (MV3, ES module).
//
// Orchestrates the user's REAL Chrome/Brave windows into a tiled grid.
// Each pane is a genuine browser window (default type "normal" -> has an
// address bar, so you can SURF the web from every pane). No iframes.
//
// State:
//   chrome.storage.session  -> live workspace (window ids, layout, active idx)
//   chrome.storage.local     -> settings + named saved sessions
// The SW can be torn down at any time, so every handler re-reads state.

import { computeRects } from './tiling.js';

const DEFAULTS = {
  seedUrl: 'https://www.google.com',
  defaultPanes: 4,
  maxPanes: 12,
  layout: 'grid',     // 'grid' | 'bsp'
  gap: 0,             // px between panes
  barHeight: 60,      // px reserved at the bottom for the control bar
  windowType: 'normal', // 'normal' = omnibox + surfable (recommended) | 'popup' = clean mode
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...(settings || {}) };
}
async function getState() {
  const { workspace } = await chrome.storage.session.get('workspace');
  return workspace || null;
}
async function setState(ws) {
  await chrome.storage.session.set({ workspace: ws });
}

// Pick the work area of the display under the focused window, else primary.
async function getWorkArea() {
  const displays = await chrome.system.display.getInfo();
  let d = displays.find((x) => x.isPrimary) || displays[0];
  try {
    const win = await chrome.windows.getLastFocused();
    if (win && typeof win.left === 'number') {
      const cx = win.left + (win.width || 0) / 2;
      const cy = win.top + (win.height || 0) / 2;
      const hit = displays.find(
        (x) =>
          cx >= x.workArea.left && cx < x.workArea.left + x.workArea.width &&
          cy >= x.workArea.top && cy < x.workArea.top + x.workArea.height
      );
      if (hit) d = hit;
    }
  } catch (_) {}
  return d.workArea; // {left, top, width, height}
}

function normalizeUrl(s) {
  s = (s || '').trim();
  if (!s) return DEFAULTS.seedUrl;
  // SECURITY: only http(s) may pass through as a literal URL. Anything else
  // (javascript:, data:, file:, chrome:, etc.) is treated as a search query, so
  // we never navigate a pane to a dangerous scheme from user/stored input.
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return 'https://' + s;
  return 'https://www.google.com/search?q=' + encodeURIComponent(s);
}

// Drop panes whose windows the user already closed.
async function pruneClosed(ws) {
  const alive = [];
  for (const p of ws.panes) {
    try {
      await chrome.windows.get(p.winId);
      alive.push(p);
    } catch (_) {}
  }
  ws.panes = alive;
  if (ws.activeIdx >= alive.length) ws.activeIdx = alive.length - 1;
  if (ws.activeIdx < 0) ws.activeIdx = 0;
  return ws;
}

// IMPORTANT: Chrome IGNORES left/top/width/height when they are combined with
// `state` in the SAME windows.update call. So un-maximize FIRST, then set the
// bounds in a SECOND call. (This was the "everything opens maximized & stacked"
// bug.)
async function applyBounds(winId, r) {
  try { await chrome.windows.update(winId, { state: 'normal' }); } catch (_) {}
  try {
    await chrome.windows.update(winId, { left: r.left, top: r.top, width: r.width, height: r.height });
  } catch (_) {}
}

function paneArea(full, s) {
  return {
    left: full.left,
    top: full.top,
    width: full.width,
    height: Math.max(200, full.height - s.barHeight),
  };
}

async function tile() {
  const s = await getSettings();
  let ws = await getState();
  if (!ws || !ws.panes.length) return;
  ws = await pruneClosed(ws);
  if (!ws.panes.length) { await setState(ws); return; }

  const full = await getWorkArea();
  const rects = computeRects(ws.layout, paneArea(full, s), ws.panes.length, s.gap);
  for (let i = 0; i < ws.panes.length; i++) {
    if (rects[i]) await applyBounds(ws.panes[i].winId, rects[i]);
  }
  await setState(ws);
  broadcast();
}

async function openBar() {
  const s = await getSettings();
  const full = await getWorkArea();
  let ws = await getState();
  if (ws && ws.barWinId != null) {
    try { await chrome.windows.get(ws.barWinId); return; } catch (_) {}
  }
  try {
    const win = await chrome.windows.create({
      url: chrome.runtime.getURL('control-bar.html'),
      type: 'popup',
      focused: true, // briefly focus so it's drawn on top, then panes can be clicked
      left: full.left,
      top: full.top + full.height - s.barHeight,
      width: full.width,
      height: s.barHeight,
    });
    // Chrome enforces a minimum popup height and may clamp; re-read the actual
    // height and pin the bar flush to the bottom of the work area so it stays visible.
    try {
      const got = await chrome.windows.get(win.id);
      const h = got.height || s.barHeight;
      await chrome.windows.update(win.id, {
        left: full.left, top: full.top + full.height - h, width: full.width,
      });
    } catch (_) {}
    ws = (await getState()) || {};
    ws.barWinId = win.id;
    await setState(ws);
  } catch (e) {
    console.error('[chrome_zellij] control bar failed to open:', e);
  }
}

async function openWorkspace() {
  const s = await getSettings();
  let ws = await getState();
  if (ws && ws.panes && ws.panes.length) {
    ws = await pruneClosed(ws);
    if (ws.panes.length) { await setState(ws); await tile(); await openBar(); return; }
  }
  const n = clamp(s.defaultPanes, 1, s.maxPanes);
  const full = await getWorkArea();
  const rects = computeRects(s.layout, paneArea(full, s), n, s.gap);
  const panes = [];
  for (let i = 0; i < n; i++) {
    const r = rects[i] || {};
    try {
      // create already-positioned so windows DON'T open maximized & stack
      const win = await chrome.windows.create({
        url: s.seedUrl, type: s.windowType, focused: i === n - 1,
        left: r.left, top: r.top, width: r.width, height: r.height,
      });
      panes.push({ winId: win.id, url: s.seedUrl });
    } catch (e) { console.error('[chrome_zellij] pane create failed:', e); }
  }
  ws = { panes, layout: s.layout, activeIdx: panes.length - 1, barWinId: null };
  await setState(ws);
  await tile();     // enforce bounds (2-step un-maximize) for any that opened maximized
  await openBar();
}

async function addPane(url) {
  const s = await getSettings();
  let ws = await getState();
  if (!ws) return openWorkspace();
  ws = await pruneClosed(ws);
  if (ws.panes.length >= s.maxPanes) { broadcast('Max panes reached (' + s.maxPanes + ')'); return; }
  const u = url ? normalizeUrl(url) : s.seedUrl;
  try {
    const win = await chrome.windows.create({ url: u, type: s.windowType, focused: true });
    ws.panes.push({ winId: win.id, url: u });
    ws.activeIdx = ws.panes.length - 1;
    await setState(ws);
    await tile();
  } catch (_) {}
}

async function closePane(idx) {
  let ws = await getState();
  if (!ws) return;
  ws = await pruneClosed(ws);
  const p = ws.panes[idx];
  if (!p) return;
  try { await chrome.windows.remove(p.winId); } catch (_) {}
  ws.panes.splice(idx, 1);
  if (ws.activeIdx >= ws.panes.length) ws.activeIdx = ws.panes.length - 1;
  await setState(ws);
  await tile();
}

async function focusPane(idx) {
  let ws = await getState();
  if (!ws) return;
  ws = await pruneClosed(ws);
  const p = ws.panes[idx];
  if (!p) return;
  ws.activeIdx = idx;
  await setState(ws);
  try { await chrome.windows.update(p.winId, { focused: true, drawAttention: true }); } catch (_) {}
  broadcast();
}

async function focusDelta(d) {
  const ws = await getState();
  if (!ws || !ws.panes.length) return;
  const n = ws.panes.length;
  const idx = ((ws.activeIdx + d) % n + n) % n;
  await focusPane(idx);
}

async function setLayout(mode) {
  const ws = await getState();
  if (!ws) return;
  ws.layout = mode === 'bsp' ? 'bsp' : 'grid';
  await setState(ws);
  await tile();
}

// Navigate the active tab of a pane window — lets you surf from the control bar
// (and is the navigation path for "clean mode" chromeless windows).
async function openUrlInPane(idx, url) {
  const ws = await getState();
  if (!ws) return;
  const p = ws.panes[idx];
  if (!p) return;
  const u = normalizeUrl(url);
  try {
    const tabs = await chrome.tabs.query({ windowId: p.winId, active: true });
    if (tabs[0]) {
      await chrome.tabs.update(tabs[0].id, { url: u });
      p.url = u;
      await setState(ws);
    }
    await chrome.windows.update(p.winId, { focused: true });
  } catch (_) {}
  broadcast();
}

// ---- named sessions (layout + urls only; never cookies/logins) ----
async function saveSession(name) {
  const ws = await getState();
  if (!ws) return;
  const { sessions } = await chrome.storage.local.get('sessions');
  const map = sessions || {};
  map[name] = { layout: ws.layout, panes: ws.panes.map((p) => ({ url: p.url })) };
  await chrome.storage.local.set({ sessions: map });
  broadcast('Saved session "' + name + '"');
}
async function listSessions() {
  const { sessions } = await chrome.storage.local.get('sessions');
  return Object.keys(sessions || {});
}
async function loadSession(name) {
  const { sessions } = await chrome.storage.local.get('sessions');
  const def = (sessions || {})[name];
  if (!def) return;
  const s = await getSettings();
  const panes = [];
  for (let i = 0; i < def.panes.length; i++) {
    try {
      const win = await chrome.windows.create({ url: def.panes[i].url, type: s.windowType, focused: false });
      panes.push({ winId: win.id, url: def.panes[i].url });
    } catch (_) {}
  }
  const ws = { panes, layout: def.layout || 'grid', activeIdx: 0, barWinId: (await getState() || {}).barWinId ?? null };
  await setState(ws);
  await tile();
  await openBar();
}

// ---- bar messaging ----
function broadcast(toast) {
  chrome.runtime.sendMessage({ type: 'state-changed', toast }).catch(() => {});
}

async function snapshot() {
  const s = await getSettings();
  let ws = await getState();
  if (ws) ws = await pruneClosed(ws);
  const panes = [];
  if (ws) {
    for (const p of ws.panes) {
      let title = '';
      try {
        const tabs = await chrome.tabs.query({ windowId: p.winId, active: true });
        title = tabs[0] ? (tabs[0].title || tabs[0].url || p.url) : p.url;
      } catch (_) { title = p.url; }
      panes.push({ url: p.url, title });
    }
  }
  return { settings: s, layout: ws ? ws.layout : s.layout, activeIdx: ws ? ws.activeIdx : 0, panes };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // SECURITY: only accept messages from THIS extension's own pages (the control
  // bar / options). Web pages can't reach us (no externally_connectable), but we
  // validate the sender anyway as defense in depth.
  if (!sender || sender.id !== chrome.runtime.id) return;
  (async () => {
    switch (msg && msg.cmd) {
      case 'getState': sendResponse(await snapshot()); return;
      case 'focus': await focusPane(msg.idx); break;
      case 'focusDelta': await focusDelta(msg.d); break;
      case 'new': await addPane(msg.url); break;
      case 'close': await closePane(msg.idx); break;
      case 'layout': await setLayout(msg.mode); break;
      case 'retile': await tile(); break;
      case 'openUrl': await openUrlInPane(msg.idx, msg.url); break;
      case 'saveSession': await saveSession(msg.name || 'work'); break;
      case 'loadSession': await loadSession(msg.name); break;
      case 'listSessions': sendResponse(await listSessions()); return;
      default: break;
    }
    sendResponse({ ok: true });
  })();
  return true; // async response
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'open-workspace') openWorkspace();
  else if (cmd === 'new-pane') addPane();
  else if (cmd === 'focus-next') focusDelta(1);
  else if (cmd === 'focus-prev') focusDelta(-1);
});

chrome.action.onClicked.addListener(() => openWorkspace());

chrome.windows.onRemoved.addListener(async (winId) => {
  const ws = await getState();
  if (!ws) return;
  if (ws.barWinId === winId) { ws.barWinId = null; await setState(ws); return; }
  const i = ws.panes.findIndex((p) => p.winId === winId);
  if (i >= 0) {
    ws.panes.splice(i, 1);
    if (ws.activeIdx >= ws.panes.length) ws.activeIdx = ws.panes.length - 1;
    await setState(ws);
    await tile();
  }
});
