# chrome_zellij — interactive demo

A **Zellij-style tiled workspace for Chrome & Brave**: one screen showing all your
browser sessions as live, tiled panes, with fast switching by **mouse or keyboard**.

👉 **Live demo:** https://brick30llc-ctrl.github.io/chrome-zellij-demo/

This page is a **self-contained UI prototype** — open it in any browser, on phone,
tablet, or laptop. There's nothing to install and no data leaves the page.

## Try it

- **Mouse:** click a pane to focus it; click a pane chip in the bottom bar to jump.
- **Keyboard (Zellij modal):** press **Ctrl + Space** to enter *Leader* mode, then:
  - `h` `j` `k` `l` — move focus left / down / up / right (arrow keys work too)
  - `n` new pane · `x` close pane · `g` toggle layout (grid ⇄ binary-split)
  - `1`–`9` jump to a pane · `/` open the command palette · `?` help

## How the prototype relates to the real product

The panes here are lightweight **mockups** so the demo can run anywhere. The real
product is a browser extension that tiles your **actual Chrome/Brave windows**, so
full sites and logins work normally.

> **No iframes.** Neither the demo nor the product uses iframes — embedded sites
> would lose their login session due to browser storage partitioning, so the real
> build orchestrates genuine browser windows instead.

## Status

UI prototype. The full extension (real-window tiling, sessions, multi-account,
cross-platform) is in active development.
