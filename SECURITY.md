# Security

This documents the security posture of the chrome_zellij extension and native
host, and the results of a defensive review (OWASP-relevant categories + Chrome
MV3 best practices). Last reviewed for **v0.1.2**.

## Reporting a vulnerability

Please open a private report / issue rather than a public PR with exploit details.
We'll respond as fast as we can.

## Design posture (small attack surface by construction)

- **No iframes.** The product tiles real browser windows; it never embeds sites.
- **No content scripts** and **no `host_permissions`** — the extension does not run
  code on, or read the contents of, the pages you visit.
- **No remote code.** Only local files are loaded; no CDN/`eval`/`new Function`.
  The MV3 default Content-Security-Policy is left intact (no inline scripts).
- **No third-party dependencies.** The extension is vanilla JS; the native host is
  Go using only the standard library — i.e. **no supply-chain surface** (nothing
  from npm or external Go modules).
- **No network calls of our own** (no telemetry, no analytics, no fetch to any
  server). The only navigation is the windows you open.

## Permissions (least privilege)

| Permission | Why |
|------------|-----|
| `windows` | create/position/focus the tiled pane windows |
| `tabs` | read the active tab's title/URL (for pane labels) and navigate a pane |
| `system.display` | read the work area to compute the tiling grid |
| `storage` | save settings + named sessions (layout + URLs only) |
| `commands` | the global keyboard shortcuts |

Not requested: `<all_urls>`, `host_permissions`, `webRequest`,
`declarativeNetRequest`, `scripting`, `cookies`, `history`, `bookmarks`,
`externally_connectable`.

## Review findings & mitigations

- **Injection / dangerous URL schemes (OWASP A03).** All navigation goes through a
  normalizer that allows **only `http(s)`**; `javascript:`, `data:`, `file:`, etc.
  are treated as a search query and never navigated to. Enforced in both the
  extension (`normalizeUrl`) and the native host (`isWebURL`).
- **DOM XSS (A03).** Untrusted strings (page titles/URLs) are inserted with
  `textContent`, never `innerHTML`. The only `innerHTML` writes are static markup
  or clearing (`''`).
- **Broken access control / message spoofing (A01).** `runtime.onMessage` rejects
  any message whose `sender.id` isn't this extension. Web pages cannot message the
  extension at all (no `externally_connectable`).
- **Native messaging integrity (A08).** The host manifest's `allowed_origins` must
  be the **exact** extension ID (the installers fill this in) — never `*`. The host
  executes only a resolved Chrome/Brave binary via `exec.Command(bin, args...)`
  (argv, **no shell** → no command injection) and validates the URL scheme.
- **Resource exhaustion / DoS.** The native host caps an incoming message at 1 MiB
  to avoid unbounded allocation.
- **Security misconfiguration (A05).** Minimal permissions (above); no weakened CSP.

## Data handling & privacy

- chrome_zellij **never stores or transmits cookies, passwords, or login state.**
  Logins live where they always do — in your real browser profile.
- `chrome.storage.local` holds your **settings** and **named sessions** (each
  session = layout + the pane URLs). `chrome.storage.sync`, if used, carries only
  **layout + URLs** across your signed-in browsers.
- ⚠️ **Note:** saved/synced **URLs can themselves contain sensitive tokens** (some
  apps put secrets in query strings). If that matters to you, avoid saving sessions
  that include such URLs, or keep sync off.

## Native host (optional component)

The Go native host is **not enabled by default** (the extension works fully without
it). It exists to launch per-profile windows for independent logins. It runs only
the located browser binary, accepts commands only from the configured extension ID,
validates URL schemes, and caps message size. Future window-control features
(Phase 5) will add OS-level capabilities and must keep these guarantees (scoped
permissions, http(s)-only, confirm-before-run for any command execution).
