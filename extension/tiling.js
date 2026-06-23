// tiling.js — pure layout math. Given a work-area rect and a pane count,
// return integer {left,top,width,height} rects in screen pixels.
// No browser APIs here so it stays unit-testable.

function gridRects(area, n, gap) {
  const rects = [];
  if (n <= 0) return rects;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    // last row may hold fewer panes — stretch them to fill the width
    const itemsThisRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
    const c = i - r * cols;
    const cellW = area.width / itemsThisRow;
    const cellH = area.height / rows;
    rects.push({
      left: Math.round(area.left + c * cellW + gap),
      top: Math.round(area.top + r * cellH + gap),
      width: Math.round(cellW - gap * 2),
      height: Math.round(cellH - gap * 2),
    });
  }
  return rects;
}

// Recursive binary space partition (classic i3/Zellij feel).
function bspRects(area, n, gap) {
  const rects = new Array(n);
  function split(idxs, rect, vert) {
    if (idxs.length === 1) {
      rects[idxs[0]] = {
        left: Math.round(rect.left + gap),
        top: Math.round(rect.top + gap),
        width: Math.round(rect.width - gap * 2),
        height: Math.round(rect.height - gap * 2),
      };
      return;
    }
    const half = Math.ceil(idxs.length / 2);
    const a = idxs.slice(0, half);
    const b = idxs.slice(half);
    if (vert) {
      const wa = rect.width * (a.length / idxs.length);
      split(a, { left: rect.left, top: rect.top, width: wa, height: rect.height }, !vert);
      split(b, { left: rect.left + wa, top: rect.top, width: rect.width - wa, height: rect.height }, !vert);
    } else {
      const ha = rect.height * (a.length / idxs.length);
      split(a, { left: rect.left, top: rect.top, width: rect.width, height: ha }, !vert);
      split(b, { left: rect.left, top: rect.top + ha, width: rect.width, height: rect.height - ha }, !vert);
    }
  }
  if (n > 0) split([...Array(n).keys()], area, true);
  return rects;
}

export function computeRects(mode, area, n, gap = 0) {
  return mode === 'bsp' ? bspRects(area, n, gap) : gridRects(area, n, gap);
}
