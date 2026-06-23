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
load();
