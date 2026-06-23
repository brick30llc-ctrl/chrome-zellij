# chrome_zellij — manual test checklist (Phase 1)

This build can't be tested in a headless environment, so run through this in your
real Chrome and Brave. ~5 minutes.

## Load
- [ ] Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick the `extension/` folder. No manifest errors appear.
- [ ] Note the **extension id** (you'll need it only for the optional native host).
- [ ] Repeat in Brave at `brave://extensions` — loads identically.

## Open & tile
- [ ] Click the toolbar icon (or **Ctrl+Shift+Z**). Expect **4 windows** open to `google.com`, tiled into a grid, with a thin **control bar** across the bottom.
  - ⚠️ If only ONE window opens, the browser **blocked the pop-ups** (common in Brave). Allow pop-ups for the seed site (address-bar pop-up icon → *Always allow*, or lower Brave Shields), then retry. See README → Troubleshooting.
- [ ] The bar shows: `◆ work`, a `NORMAL` mode pill, four pane chips (with page titles), a surf box, keybind hints, and a live clock.

## Surf (the key requirement)
- [ ] In **any pane**, click its address bar, type a URL, press Enter — it navigates. ✅ you can surf from each window.
- [ ] In the **bar's surf box**, type `github.com` and press Enter — the **focused** pane navigates there.
- [ ] Type a non-URL (e.g. `weather`) in the surf box → focused pane does a Google search.

## Switch — mouse
- [ ] Click a pane **chip** in the bar → that window comes to the front (focused chip highlights green).

## Switch — keyboard
- [ ] **Ctrl+Shift+.** focuses the next pane; **Ctrl+Shift+,** the previous (these work even when the bar isn't focused).
- [ ] Click the bar to focus it, then **Ctrl+Space** → mode flips to **LEADER** (amber). Press `l`/`j` (next), `h`/`k` (prev), `1`–`4` (jump). 

## Layout
- [ ] Press `g` (bar focused) or run **Layout: binary-split** from the palette (`/`) → windows reflow to a BSP arrangement. Toggle back to grid.
- [ ] Add a pane: `n` (or **Ctrl+Shift+Z** won't add — use `n` or the palette "New pane"). Grid re-tiles to fit (e.g. 5–6 panes).
- [ ] Close a pane: `x` (or palette). Remaining panes re-tile to fill.

## Command palette
- [ ] Press `/` (bar focused) → palette opens (bar grows upward). Type to filter, ↑/↓ to move, Enter to run, Esc to close (bar shrinks back).

## Sessions
- [ ] Palette → **Save session "work"**. Toast confirms.
- [ ] Close all pane windows. Palette → **Load session…** → enter `work` → panes reopen at the saved URLs. (Logins are NOT restored by design — real browser profile handles those.)

## Settings
- [ ] Right-click the extension → **Options**. Change **Default panes** to 6 and **Layout** to BSP, Save. Re-open the workspace (Ctrl+Shift+Z after closing panes) → 6 BSP panes.
- [ ] Switch **Pane window type** to `clean` (chromeless) and re-open → panes have no address bar; confirm you can still surf via the bar's surf box.

## Optional: native host (independent logins)
- [ ] `cd native-host && go build -o chrome_zellij_host .` compiles with no errors.
- [ ] `./install.sh <extension-id>` (or `install.ps1`) reports manifests installed for Chrome + Brave.
- [ ] (Phase 2) Wiring the extension to `connectNative` is not in this MVP — see README.

## Report
Note anything that didn't behave as above (esp. tiling math on multi-monitor,
window min-size clamping, or the bar getting covered) so we can fix in the next pass.
