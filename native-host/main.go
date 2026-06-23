// chrome_zellij native messaging host (scaffold).
//
// Why this exists: a pure extension can only open windows in ONE browser
// profile, so all panes share one login. This host launches REAL chromeless
// `--app` windows with their own --profile-directory / --user-data-dir, giving
// each pane an INDEPENDENT session (e.g. several Google/GitHub accounts), and
// can position them. It speaks Chrome's native-messaging protocol over stdio:
// a 4-byte little-endian length prefix followed by a UTF-8 JSON message.
//
// Status: launch-app-window + best-effort positioning are implemented (via the
// browser's own --window-position/--window-size flags). move/focus/list/hotkey
// need OS-specific window APIs and are stubbed with TODOs (see README).
//
// Build:  go build -o chrome_zellij_host .
package main

import (
	"bufio"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

type Request struct {
	ID      string `json:"id"`
	Cmd     string `json:"cmd"` // launch-app-window | move-window | focus-window | list-windows | register-hotkey | ping
	URL     string `json:"url,omitempty"`
	Browser string `json:"browser,omitempty"` // "chrome" | "brave"
	Profile string `json:"profile,omitempty"` // --profile-directory value, e.g. "Default", "Profile 1"
	UserDir string `json:"userDataDir,omitempty"`
	Left    int    `json:"left,omitempty"`
	Top     int    `json:"top,omitempty"`
	Width   int    `json:"width,omitempty"`
	Height  int    `json:"height,omitempty"`
}

type Response struct {
	ID    string `json:"id"`
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
	Note  string `json:"note,omitempty"`
	PID   int    `json:"pid,omitempty"`
}

// maxMessageBytes caps an incoming native message to avoid huge allocations (DoS).
const maxMessageBytes = 1 << 20 // 1 MiB

// isWebURL allows ONLY http(s) — never javascript:, data:, file:, etc.
func isWebURL(u string) bool {
	l := strings.ToLower(strings.TrimSpace(u))
	return strings.HasPrefix(l, "http://") || strings.HasPrefix(l, "https://")
}

func main() {
	r := bufio.NewReader(os.Stdin)
	w := bufio.NewWriter(os.Stdout)
	defer w.Flush()
	for {
		msg, err := readMessage(r)
		if err != nil {
			return // stdin closed -> browser disconnected
		}
		resp := handle(msg)
		_ = writeMessage(w, resp)
		w.Flush()
	}
}

func readMessage(r *bufio.Reader) (*Request, error) {
	var n uint32
	if err := binary.Read(r, binary.LittleEndian, &n); err != nil {
		return nil, err
	}
	if n > maxMessageBytes {
		return nil, errors.New("incoming native message too large")
	}
	buf := make([]byte, n)
	if _, err := io.ReadFull(r, buf); err != nil {
		return nil, err
	}
	var req Request
	if err := json.Unmarshal(buf, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func writeMessage(w *bufio.Writer, resp Response) error {
	b, err := json.Marshal(resp)
	if err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, uint32(len(b))); err != nil {
		return err
	}
	_, err = w.Write(b)
	return err
}

func handle(req *Request) Response {
	switch req.Cmd {
	case "ping":
		return Response{ID: req.ID, OK: true, Note: "chrome_zellij host on " + runtime.GOOS}
	case "launch-app-window":
		return launchAppWindow(req)
	case "move-window", "focus-window", "list-windows", "register-hotkey":
		// TODO: OS-specific window control.
		//   Windows: Win32 SetWindowPos / SetForegroundWindow / EnumWindows; RegisterHotKey.
		//   macOS:   Accessibility API or AppleScript (System Events); CGEventTap for hotkeys.
		//   Linux:   wmctrl / xdotool (X11) or the compositor's API (Wayland).
		return Response{ID: req.ID, OK: false, Error: "not implemented in scaffold", Note: req.Cmd + " needs OS-specific window APIs (see README TODO)"}
	default:
		return Response{ID: req.ID, OK: false, Error: "unknown cmd: " + req.Cmd}
	}
}

// launchAppWindow opens a real chromeless --app window with its own profile,
// positioned via the browser's own window flags (best-effort).
func launchAppWindow(req *Request) Response {
	bin := browserBinary(req.Browser)
	if bin == "" {
		return Response{ID: req.ID, OK: false, Error: "could not locate browser binary for '" + req.Browser + "'"}
	}
	url := req.URL
	if url == "" {
		url = "https://www.google.com"
	}
	if !isWebURL(url) {
		return Response{ID: req.ID, OK: false, Error: "refusing to open non-http(s) URL"}
	}
	args := []string{"--app=" + url, "--new-window"}
	if req.Profile != "" {
		args = append(args, "--profile-directory="+req.Profile)
	}
	if req.UserDir != "" {
		args = append(args, "--user-data-dir="+req.UserDir)
	}
	if req.Width > 0 && req.Height > 0 {
		args = append(args, "--window-position="+itoa(req.Left)+","+itoa(req.Top))
		args = append(args, "--window-size="+itoa(req.Width)+","+itoa(req.Height))
	}
	cmd := exec.Command(bin, args...)
	if err := cmd.Start(); err != nil {
		return Response{ID: req.ID, OK: false, Error: err.Error()}
	}
	pid := 0
	if cmd.Process != nil {
		pid = cmd.Process.Pid
	}
	// don't wait; let the browser window live independently
	go func() { _ = cmd.Wait() }()
	return Response{ID: req.ID, OK: true, PID: pid, Note: "launched " + req.Browser + " --app window"}
}

func itoa(n int) string {
	b := []byte{}
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	if neg {
		b = append([]byte{'-'}, b...)
	}
	return string(b)
}

// browserBinary resolves a Chrome/Brave executable per OS. Adjust paths to taste.
func browserBinary(browser string) string {
	brave := browser == "brave"
	switch runtime.GOOS {
	case "windows":
		if brave {
			return firstExisting([]string{
				os.Getenv("ProgramFiles") + `\BraveSoftware\Brave-Browser\Application\brave.exe`,
				os.Getenv("ProgramFiles(x86)") + `\BraveSoftware\Brave-Browser\Application\brave.exe`,
				os.Getenv("LOCALAPPDATA") + `\BraveSoftware\Brave-Browser\Application\brave.exe`,
			})
		}
		return firstExisting([]string{
			os.Getenv("ProgramFiles") + `\Google\Chrome\Application\chrome.exe`,
			os.Getenv("ProgramFiles(x86)") + `\Google\Chrome\Application\chrome.exe`,
			os.Getenv("LOCALAPPDATA") + `\Google\Chrome\Application\chrome.exe`,
		})
	case "darwin":
		if brave {
			return firstExisting([]string{"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"})
		}
		return firstExisting([]string{"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"})
	default: // linux
		names := []string{"google-chrome", "google-chrome-stable", "chromium", "chromium-browser"}
		if brave {
			names = []string{"brave-browser", "brave"}
		}
		for _, n := range names {
			if p, err := exec.LookPath(n); err == nil {
				return p
			}
		}
		return ""
	}
}

func firstExisting(paths []string) string {
	for _, p := range paths {
		if p == "" {
			continue
		}
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}
