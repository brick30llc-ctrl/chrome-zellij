// control-bar.js — the Zellij-style status bar + command palette.
// Runs in a small popup window. Talks to the background service worker
// via runtime messaging. Note: modal keybinds (h/j/k/l, n, x, /) fire only
// while THIS bar window is focused; the global hotkeys (open workspace,
// focus next/prev) are registered via chrome.commands and work anywhere.

const $ = (s) => document.querySelector(s);
const send = (m) => chrome.runtime.sendMessage(m).catch(() => ({}));

let snap = { panes: [], activeIdx: 0, layout: 'grid' };
let leader = false;

async function refresh() {
  const s = await send({ cmd: 'getState' });
  if (s && s.panes) snap = s;
  render();
}

function render() {
  $('#sess').textContent = 'work';
  const wrap = $('#chips');
  wrap.innerHTML = '';
  snap.panes.forEach((p, i) => {
    const c = document.createElement('div');
    c.className = 'chip' + (i === snap.activeIdx ? ' active' : '');
    const title = (p.title || p.url || '').replace(/^https?:\/\//, '');
    c.innerHTML = `<span class="ci">${i + 1}</span><span class="ct"></span>`;
    c.querySelector('.ct').textContent = title;
    c.title = p.title || p.url || '';
    c.onclick = () => send({ cmd: 'focus', idx: i });
    wrap.appendChild(c);
  });
  setMode(leader);
}

function setMode(on) {
  leader = on;
  const m = $('#mode');
  m.textContent = on ? 'LEADER' : 'NORMAL';
  m.className = 'mode ' + (on ? 'leader' : 'normal');
}

let toastT;
function toast(msg) {
  if (!msg) return;
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.add('hidden'), 2200);
}

// ---- command palette (grows the bar window upward, then restores) ----
let savedBounds = null;
async function growForPalette(open) {
  const w = await chrome.windows.getCurrent();
  if (open) {
    savedBounds = { top: w.top, height: w.height };
    const newH = 340;
    await chrome.windows.update(w.id, { top: w.top - (newH - w.height), height: newH, focused: true });
  } else if (savedBounds) {
    await chrome.windows.update(w.id, { top: savedBounds.top, height: savedBounds.height });
    savedBounds = null;
  }
}

function baseCommands() {
  const cmds = [
    { name: 'New pane', run: () => send({ cmd: 'new' }) },
    { name: 'Close focused pane', run: () => send({ cmd: 'close', idx: snap.activeIdx }) },
    { name: 'Layout: grid', run: () => send({ cmd: 'layout', mode: 'grid' }) },
    { name: 'Layout: binary-split (BSP)', run: () => send({ cmd: 'layout', mode: 'bsp' }) },
    { name: 'Re-tile windows', run: () => send({ cmd: 'retile' }) },
    { name: 'Save session "work"', run: () => send({ cmd: 'saveSession', name: 'work' }) },
    { name: 'Load session…', run: loadSessionFlow },
  ];
  snap.panes.forEach((p, i) => cmds.push({ name: `Focus pane ${i + 1} — ${(p.title || p.url || '').slice(0, 40)}`, run: () => send({ cmd: 'focus', idx: i }) }));
  return cmds;
}

let palCmds = [], palSel = 0;
async function openPalette() {
  await growForPalette(true);
  $('#palette').classList.remove('hidden');
  const inp = $('#pal-input');
  inp.value = '';
  palCmds = baseCommands();
  palSel = 0;
  drawPalette('');
  inp.focus();
}
async function closePalette() {
  $('#palette').classList.add('hidden');
  await growForPalette(false);
}
function drawPalette(q) {
  q = q.toLowerCase();
  const list = $('#pal-list');
  list.innerHTML = '';
  const filtered = q ? palCmds.filter((c) => c.name.toLowerCase().includes(q)) : palCmds;
  filtered.forEach((c, i) => {
    const r = document.createElement('div');
    r.className = 'row' + (i === palSel ? ' sel' : '');
    r.textContent = c.name;
    r.onclick = async () => { await closePalette(); c.run(); };
    list.appendChild(r);
  });
  drawPalette._filtered = filtered;
}

async function loadSessionFlow() {
  const names = await send({ cmd: 'listSessions' });
  if (!Array.isArray(names) || !names.length) { toast('No saved sessions'); return; }
  const name = prompt('Load which session?\n' + names.join(', '), names[0]);
  if (name) send({ cmd: 'loadSession', name: name.trim() });
}

// ---- keyboard ----
document.addEventListener('keydown', async (e) => {
  const palOpen = !$('#palette').classList.contains('hidden');
  if (palOpen) {
    const f = drawPalette._filtered || [];
    if (e.key === 'Escape') { await closePalette(); }
    else if (e.key === 'ArrowDown') { palSel = Math.min(palSel + 1, f.length - 1); drawPalette($('#pal-input').value); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { palSel = Math.max(palSel - 1, 0); drawPalette($('#pal-input').value); e.preventDefault(); }
    else if (e.key === 'Enter') { const c = f[palSel]; await closePalette(); if (c) c.run(); }
    return;
  }
  // don't hijack typing in the surf box
  if (document.activeElement === $('#surf')) {
    if (e.key === 'Enter') { const v = $('#surf').value; if (v.trim()) { send({ cmd: 'openUrl', idx: snap.activeIdx, url: v }); $('#surf').value = ''; } }
    if (e.key === 'Escape') $('#surf').blur();
    return;
  }

  if (e.ctrlKey && (e.code === 'Space' || e.key === ' ')) { setMode(!leader); e.preventDefault(); return; }
  if (e.key === '/') { openPalette(); e.preventDefault(); return; }
  if (e.key === 'Escape') { setMode(false); return; }

  let handled = true;
  switch (e.key) {
    case 'h': case 'k': send({ cmd: 'focusDelta', d: -1 }); break;
    case 'l': case 'j': send({ cmd: 'focusDelta', d: 1 }); break;
    case 'n': send({ cmd: 'new' }); break;
    case 'x': send({ cmd: 'close', idx: snap.activeIdx }); break;
    case 'g': send({ cmd: 'layout', mode: snap.layout === 'grid' ? 'bsp' : 'grid' }); break;
    default:
      if (e.key >= '1' && e.key <= '9') send({ cmd: 'focus', idx: parseInt(e.key, 10) - 1 });
      else handled = false;
  }
  if (handled) { if (leader) setMode(false); e.preventDefault(); }
});

$('#surf').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const v = $('#surf').value;
    if (v.trim()) { send({ cmd: 'openUrl', idx: snap.activeIdx, url: v }); $('#surf').value = ''; }
  }
});
$('#pal-input').addEventListener('input', (e) => { palSel = 0; drawPalette(e.target.value); });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'state-changed') { toast(msg.toast); refresh(); }
});

function tick() {
  const d = new Date();
  $('#clock').textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
}
setInterval(tick, 1000); tick();
setInterval(refresh, 4000); // light poll so titles/active stay fresh
refresh();
