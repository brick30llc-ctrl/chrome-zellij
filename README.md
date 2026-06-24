# chrome_zellij

A **Zellij-style tiled workspace for Chrome & Brave**: one screen showing all your
browser sessions as live, tiled panes, with fast switching by **mouse or keyboard**.
Every pane is a **real, navigable browser window** — surf the web and stay logged in.

- 🧩 **Install the extension → [INSTALL.md](INSTALL.md)**
- 👀 **Live preview (no install):** https://brick30llc-ctrl.github.io/chrome-zellij/

The preview page is a lightweight UI mockup so you can see the look and feel in any
browser (phone/tablet/laptop). The installable extension does the real thing.

## Try the preview

- **Mouse:** click a pane to focus it; click a pane chip in the bottom bar to jump.
- **Keyboard (Zellij modal):** press **Ctrl + Space** to enter *Leader* mode, then:
  - `h` `j` `k` `l` — move focus left / down / up / right (arrow keys work too)
  - `n` new pane · `x` close pane · `g` toggle layout (grid ⇄ binary-split)
  - `1`–`9` jump to a pane · `/` open the command palette · `?` help

## Install the real extension

The live page above is a **preview**. To get the actual workspace that tiles your
real Chrome/Brave windows, install the unpacked extension in this repo:

📖 **Step-by-step guide → [INSTALL.md](INSTALL.md)**

Quick version:
1. **Download this repo** (green **Code** button → *Download ZIP*, then unzip — or `git clone`).
2. Open `chrome://extensions` (or `brave://extensions`) → turn on **Developer mode** (top-right).
3. Click **Load unpacked** → select the **`extension`** folder from this repo.
4. **Allow pop-ups for google.com (required, especially in Brave)** — the workspace opens
   several windows at once. Brave: Shields (lion) icon → **Shields down**; Chrome/Brave: the
   address-bar "pop-up blocked" icon → **Always allow**.
5. **Launch it:** click the **chrome_zellij toolbar icon** (pin it via the 🧩 puzzle-piece
   if it's hidden), or press **Ctrl+Shift+Z**.

   > ⚠️ **The `Ctrl+Shift+Z` hotkey may do nothing.** Browsers don't always auto-assign an
   > extension's suggested shortcut (it can conflict with a built-in one), so it's often left
   > unbound. The **toolbar icon always works** to launch the workspace. To set or fix the
   > hotkey, open **`chrome://extensions/shortcuts`** (Brave: **`brave://extensions/shortcuts`**)
   > and assign a key to *"Open / re-tile the chrome_zellij workspace"*. The extension's
   > **Options** page also lists your current shortcuts and links to that page.

Full controls, updating, and troubleshooting are in [INSTALL.md](INSTALL.md).

## How the prototype relates to the real product

The panes on the live page are lightweight **mockups** so the demo can run anywhere.
The installed extension tiles your **actual Chrome/Brave windows**, so full sites and
logins work normally.

> **No iframes.** Neither the demo nor the product uses iframes — embedded sites
> would lose their login session due to browser storage partitioning, so the real
> build orchestrates genuine browser windows instead.

## Status

Early build (v0.1.x): real-window tiling, grid + binary-split layouts, Zellij control
bar, mouse + keyboard switching, sessions, options. Native-host (independent
multi-account logins) is scaffolded. Cross-platform (Windows/macOS/Linux).
