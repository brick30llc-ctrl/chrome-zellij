// options.js — read/write settings in chrome.storage.local.
const DEFAULTS = {
  seedUrl: 'https://www.google.com',
  defaultPanes: 4,
  maxPanes: 12,
  layout: 'grid',
  gap: 0,
  barHeight: 60,
  windowType: 'normal',
};
const FIELDS = ['seedUrl', 'defaultPanes', 'maxPanes', 'layout', 'gap', 'barHeight', 'windowType'];
const NUM = new Set(['defaultPanes', 'maxPanes', 'gap', 'barHeight']);

async function load() {
  const { settings } = await chrome.storage.local.get('settings');
  const s = { ...DEFAULTS, ...(settings || {}) };
  for (const f of FIELDS) document.getElementById(f).value = s[f];
}

async function save() {
  const s = {};
  for (const f of FIELDS) {
    const v = document.getElementById(f).value;
    s[f] = NUM.has(f) ? Number(v) : v;
  }
  if (!s.seedUrl) s.seedUrl = DEFAULTS.seedUrl;
  s.defaultPanes = Math.max(1, Math.min(s.maxPanes || 12, s.defaultPanes || 4));
  await chrome.storage.local.set({ settings: s });
  const el = document.getElementById('saved');
  el.textContent = '✓ saved';
  setTimeout(() => (el.textContent = ''), 1800);
}

document.getElementById('save').addEventListener('click', save);

// ---- keyboard shortcuts panel ----
// Global commands are owned by the browser: chrome.commands.getAll() can READ
// the current bindings but there is no API to SET them, so this panel is
// read-only and points the user at the browser's own shortcuts page.

// Friendly order + labels so the list reads well regardless of getAll() order.
const CMD_ORDER = ['open-workspace', 'new-pane', 'focus-next', 'focus-prev'];
const CMD_LABELS = {
  'open-workspace': 'Open / re-tile workspace',
  'new-pane': 'New pane',
  'focus-next': 'Focus next pane',
  'focus-prev': 'Focus previous pane',
};

// Each Chromium browser exposes its own scheme for the shortcuts page.
function shortcutsUrl() {
  const ua = navigator.userAgent;
  if (navigator.brave) return 'brave://extensions/shortcuts';
  if (/\bEdg\//.test(ua)) return 'edge://extensions/shortcuts';
  if (/\bOPR\//.test(ua)) return 'opera://extensions/shortcuts';
  if (/\bVivaldi\//.test(ua)) return 'vivaldi://extensions/shortcuts';
  return 'chrome://extensions/shortcuts';
}

async function renderCommands() {
  const list = document.getElementById('cmdlist');
  let cmds = [];
  try { cmds = await chrome.commands.getAll(); } catch (_) {}
  cmds = cmds.filter((c) => c.name && !c.name.startsWith('_')); // drop reserved (_execute_action)
  cmds.sort((a, b) => {
    const ia = CMD_ORDER.indexOf(a.name), ib = CMD_ORDER.indexOf(b.name);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  list.textContent = '';
  for (const c of cmds) {
    const row = document.createElement('div');
    row.className = 'cmdrow';
    const d = document.createElement('span');
    d.className = 'cd';
    d.textContent = CMD_LABELS[c.name] || c.description || c.name;
    const k = document.createElement('span');
    const set = !!c.shortcut;
    k.className = 'ck' + (set ? '' : ' unset');
    k.textContent = set ? c.shortcut : 'Not set';
    row.append(d, k);
    list.appendChild(row);
  }
}

let hintT;
function flashHint(msg) {
  const h = document.getElementById('shortcutsHint');
  if (!h.dataset.orig) h.dataset.orig = h.textContent;
  h.textContent = msg;
  clearTimeout(hintT);
  hintT = setTimeout(() => { h.textContent = h.dataset.orig; }, 2600);
}

function initShortcutsLink() {
  const url = shortcutsUrl();
  const input = document.getElementById('shortcutsUrl');
  input.value = url;
  document.getElementById('copyShortcuts').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); flashHint('Copied — paste it into your address bar.'); }
    catch (_) { input.focus(); input.select(); flashHint('Press Ctrl/Cmd+C to copy.'); }
  });
  document.getElementById('openShortcuts').addEventListener('click', async () => {
    try { await chrome.tabs.create({ url }); }
    catch (_) { input.focus(); input.select(); flashHint('Couldn’t open it automatically — copy and paste instead.'); }
  });
}

// Re-read bindings when the user returns from the shortcuts page.
window.addEventListener('focus', renderCommands);

load();
renderCommands();
initShortcutsLink();
