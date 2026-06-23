# Installing chrome_zellij (Chrome or Brave)

chrome_zellij tiles your real browser windows, so it installs as an **unpacked
developer extension** (not from the Web Store). Takes about 2 minutes.

> Works the same in **Chrome** and **Brave** — Brave just needs one extra step
> (allowing pop-ups), called out below.

---

## 1. Get the files

- On this repo's page, click the green **Code** button → **Download ZIP**, then unzip it.
  *(or `git clone https://github.com/brick30llc-ctrl/chrome-zellij.git`)*
- Inside, the folder you'll load is **`extension`** (it contains `manifest.json`).

---

## 2. Install in Chrome

1. Open a new tab, type **`chrome://extensions`**, press **Enter**.
2. Turn on **Developer mode** (toggle, top-right).
3. Click **Load unpacked** (top-left).
4. Select the **`extension`** folder and confirm.
5. A **chrome_zellij** card appears. *(Optional: pin its icon via the 🧩 puzzle-piece in the toolbar.)*

## 3. Install in Brave

Same as Chrome, plus **one required step** (Brave blocks the pop-up windows):

1. Open **`brave://extensions`** → **Developer mode** on → **Load unpacked** → select the **`extension`** folder.
2. **Allow pop-ups** (once):
   - Click the **Brave Shields** icon (the orange **lion** in the address bar) → set **Shields = DOWN** for the site, **and/or**
   - Open **`brave://settings/content/popups`** → under **Allowed to send pop-ups and redirects**, click **Add** → enter **`https://www.google.com`** → **Add**.

---

## 4. First run

1. Click the **chrome_zellij** toolbar icon, or press **Ctrl+Shift+Z**.
2. Expect **4 windows** open to google.com, **tiled into a grid**, with a **control bar** along the bottom.

**Only ONE window opened?** The browser blocked the pop-ups:
- Click the **"pop-up blocked"** icon at the right of the address bar → **Always allow pop-ups and redirects from …** → **Done**.
- In Brave, also lower **Shields** (lion icon → Shields down).
- Press **Ctrl+Shift+Z** again.

---

## 5. Controls

- **Open / re-tile:** toolbar icon or **Ctrl+Shift+Z**
- **Surf:** type a URL in any pane's address bar — each pane is a full browser
- **Switch panes:** click a chip in the bottom bar, or **Ctrl+Shift+.** / **Ctrl+Shift+,**
- **In the bar (when focused):** **Ctrl+Space**, then `h j k l` move · `n` new · `x` close · `g` layout · `/` command palette
- **Settings:** right-click the extension icon → **Options** (seed URL, pane count, layout, etc.)

---

## Updating

`git pull` (or re-download), then on the extensions page click the **↻ reload** icon on the chrome_zellij card.

## Uninstall

`chrome://extensions` (or `brave://extensions`) → **Remove** on the chrome_zellij card.

---

## Notes

- Early build (v0.1.x). The control bar isn't always-on-top yet — if a window covers it, press **Ctrl+Shift+Z** to re-tile.
- Each pane is a real browser window (real memory use). Adjust the pane count in **Options**.
- Optional: the `native-host/` folder adds independent per-profile logins (multiple Google/GitHub accounts) — see its files for setup. Not required for normal use.
