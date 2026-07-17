"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybackPanel = void 0;
const vscode = __importStar(require("vscode"));
const PlaybackEngine_1 = require("./PlaybackEngine");
/**
 * VS Code WebView panel that replays a recorded coding session.
 *
 * Architecture
 * ────────────
 * • PlaybackEngine (extension host) drives timing and sends each CodeEvent to
 *   the WebView via panel.webview.postMessage.
 * • The WebView embeds Monaco Editor (loaded from CDN) and applies the received
 *   events to its model (INSERT/DELETE/PASTE via applyEdits, CURSOR_MOVE via
 *   setPosition, FILE_OPEN resets the buffer).
 * • The WebView sends control messages back (play / pause / setSpeed / reset)
 *   which are forwarded to the engine.
 *
 * NOTE: Monaco requires `unsafe-eval` in the Content-Security-Policy because it
 * uses `new Function` internally. Tighten this for production by self-hosting
 * the Monaco bundle and serving it via a local VS Code URI.
 */
class PlaybackPanel {
    // ── public factory ───────────────────────────────────────────────────────────
    static createOrShow(context, events) {
        if (PlaybackPanel.instance) {
            PlaybackPanel.instance.panel.reveal(vscode.ViewColumn.One);
            return;
        }
        PlaybackPanel.instance = new PlaybackPanel(context, events);
    }
    // ── constructor ──────────────────────────────────────────────────────────────
    constructor(_context, events) {
        this.panel = vscode.window.createWebviewPanel('codetrackPlayback', 'CodeTrack Playback', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        this.engine = new PlaybackEngine_1.PlaybackEngine(events, (event) => {
            void this.panel.webview.postMessage({ type: 'event', event });
        });
        this.panel.webview.html = buildHtml(events);
        this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
        this.panel.onDidDispose(() => {
            this.engine.pause();
            PlaybackPanel.instance = undefined;
        });
    }
    // ── message handler ──────────────────────────────────────────────────────────
    handleMessage(msg) {
        switch (msg.command) {
            case 'play':
                this.engine.play();
                break;
            case 'pause':
                this.engine.pause();
                break;
            case 'setSpeed':
                if (msg.value !== undefined) {
                    this.engine.setSpeed(msg.value);
                }
                break;
            case 'reset':
                this.engine.reset();
                void this.panel.webview.postMessage({ type: 'reset' });
                break;
        }
    }
}
exports.PlaybackPanel = PlaybackPanel;
// ── HTML builder (pure function, no `this`) ───────────────────────────────────
function buildHtml(events) {
    const firstFile = events.find((e) => e.filePath)?.filePath ?? 'file.ts';
    const language = detectLanguage(firstFile);
    const total = events.length;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 script-src 'unsafe-eval' https://cdnjs.cloudflare.com;
                 style-src 'unsafe-inline' https://cdnjs.cloudflare.com;
                 font-src https://cdnjs.cloudflare.com;">
  <title>CodeTrack Playback</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #1e1e1e;
      color: #ccc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      overflow: hidden;
    }

    /* ── toolbar ── */
    #toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
      flex-shrink: 0;
    }

    button {
      background: #0e639c;
      color: #fff;
      border: none;
      border-radius: 3px;
      padding: 5px 12px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover { background: #1177bb; }
    button:disabled { background: #555; cursor: default; }

    #speed-group {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 4px;
    }
    #speed-range {
      width: 120px;
      accent-color: #0e639c;
      cursor: pointer;
    }
    #speed-label { min-width: 3.5ch; font-variant-numeric: tabular-nums; }

    #progress-group {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }
    #event-counter { font-variant-numeric: tabular-nums; white-space: nowrap; }
    #progress-bar-wrap {
      width: 140px;
      height: 4px;
      background: #3c3c3c;
      border-radius: 2px;
      overflow: hidden;
    }
    #progress-bar {
      height: 100%;
      background: #0e639c;
      width: 0%;
      transition: width 0.15s linear;
    }

    /* ── editor ── */
    #editor-container { flex: 1; overflow: hidden; }
  </style>
</head>
<body>

<div id="toolbar">
  <button id="btn-play" title="Play (Space)">&#9654; Play</button>
  <button id="btn-reset" title="Reset">&#8635; Reset</button>

  <div id="speed-group">
    <span>Speed:</span>
    <input id="speed-range" type="range" min="0.5" max="10" step="0.5" value="1">
    <span id="speed-label">1&times;</span>
  </div>

  <div id="progress-group">
    <div id="progress-bar-wrap"><div id="progress-bar"></div></div>
    <span id="event-counter">0&thinsp;/&thinsp;${total}</span>
  </div>
</div>

<div id="editor-container"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
<script>
(function () {
  'use strict';

  const vscode    = acquireVsCodeApi();
  const TOTAL     = ${total};

  let editor      = null;
  let isPlaying   = false;
  let eventsDone  = 0;

  // ── Monaco init ──────────────────────────────────────────────────────────────
  require.config({
    paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
  });

  require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
      value: '',
      language: '${language}',
      theme: 'vs-dark',
      automaticLayout: true,
      readOnly: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
    });
  });

  // ── controls ─────────────────────────────────────────────────────────────────
  const btnPlay     = document.getElementById('btn-play');
  const btnReset    = document.getElementById('btn-reset');
  const speedRange  = document.getElementById('speed-range');
  const speedLabel  = document.getElementById('speed-label');
  const counter     = document.getElementById('event-counter');
  const progressBar = document.getElementById('progress-bar');

  function setPlayingUI(playing) {
    isPlaying = playing;
    btnPlay.innerHTML = playing ? '&#9646;&#9646; Pause' : '&#9654; Play';
  }

  btnPlay.addEventListener('click', () => {
    if (isPlaying) {
      setPlayingUI(false);
      vscode.postMessage({ command: 'pause' });
    } else {
      setPlayingUI(true);
      vscode.postMessage({ command: 'play' });
    }
  });

  btnReset.addEventListener('click', () => {
    setPlayingUI(false);
    eventsDone = 0;
    updateProgress();
    vscode.postMessage({ command: 'reset' });
  });

  speedRange.addEventListener('input', () => {
    const v = parseFloat(speedRange.value);
    speedLabel.textContent = v + '\\u00d7';
    vscode.postMessage({ command: 'setSpeed', value: v });
  });

  // keyboard shortcut: Space = play / pause
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      btnPlay.click();
      e.preventDefault();
    }
  });

  function updateProgress() {
    const pct = TOTAL > 0 ? (eventsDone / TOTAL) * 100 : 0;
    progressBar.style.width = pct + '%';
    counter.textContent = eventsDone + '\\u2009/\\u2009' + TOTAL;
  }

  // ── messages from extension host ─────────────────────────────────────────────
  window.addEventListener('message', (e) => {
    const msg = e.data;

    if (msg.type === 'reset') {
      if (editor) { editor.setValue(''); }
      eventsDone = 0;
      setPlayingUI(false);
      updateProgress();
      return;
    }

    if (msg.type === 'event') {
      applyEvent(msg.event);
      eventsDone++;
      updateProgress();
      if (eventsDone >= TOTAL) {
        setPlayingUI(false);
      }
    }
  });

  // ── event application ─────────────────────────────────────────────────────────
  function toMonacoRange(evt) {
    const sl = (evt.rangeStart?.line ?? 0) + 1;
    const sc = (evt.rangeStart?.character ?? 0) + 1;
    const el = (evt.rangeEnd?.line ?? evt.rangeStart?.line ?? 0) + 1;
    const ec = (evt.rangeEnd?.character ?? evt.rangeStart?.character ?? 0) + 1;
    return new monaco.Range(sl, sc, el, ec);
  }

  function applyEvent(evt) {
    if (!editor) { return; }
    const model = editor.getModel();
    if (!model) { return; }

    switch (evt.type) {
      case 'INSERT':
      case 'PASTE': {
        if (evt.textContent == null) { break; }
        let range = evt.rangeStart != null
          ? toMonacoRange(evt)
          : model.getFullModelRange();

        // Detect completion duplication (also fixes older recordings).
        // Two patterns depending on the language provider:
        //   A – word-start: completion prepended to typed prefix → "includein"
        //       Fix: expand rangeEnd to cover the typed prefix that follows.
        //   B – cursor: completion appended after typed prefix → "priprintf"
        //       Fix: expand rangeStart back to cover the typed prefix that precedes.
        if (evt.rangeStart != null &&
            evt.rangeStart.line === (evt.rangeEnd?.line ?? evt.rangeStart.line) &&
            evt.rangeStart.character === (evt.rangeEnd?.character ?? evt.rangeStart.character) &&
            evt.textContent.length > 1) {
          const col = range.startColumn; // 1-indexed
          const lineContent = model.getLineContent(range.startLineNumber);
          const colZero = col - 1; // 0-indexed

          // Pattern A: word starting at insertion point is a prefix of inserted text
          const wordAfterMatch = lineContent.substring(colZero).match(/^(\w+)/);
          if (wordAfterMatch && evt.textContent.startsWith(wordAfterMatch[1])) {
            range = new monaco.Range(
              range.startLineNumber, col,
              range.startLineNumber, col + wordAfterMatch[1].length,
            );
          } else {
            // Pattern B: word ending just before insertion point is a prefix of inserted text
            const wordBeforeMatch = lineContent.substring(0, colZero).match(/(\w+)$/);
            if (wordBeforeMatch && evt.textContent.startsWith(wordBeforeMatch[1])) {
              range = new monaco.Range(
                range.startLineNumber, col - wordBeforeMatch[1].length,
                range.startLineNumber, col,
              );
            }
          }
        }

        model.applyEdits([{ range, text: evt.textContent }]);
        break;
      }

      case 'DELETE': {
        if (evt.rangeStart == null) { break; }
        model.applyEdits([{ range: toMonacoRange(evt), text: '' }]);
        break;
      }

      case 'CURSOR_MOVE': {
        if (evt.rangeStart == null) { break; }
        const pos = {
          lineNumber: evt.rangeStart.line + 1,
          column: (evt.rangeStart.character ?? 0) + 1,
        };
        editor.setPosition(pos);
        editor.revealPositionInCenter(pos, monaco.editor.ScrollType.Smooth);
        break;
      }

      case 'FILE_OPEN': {
        editor.setValue('');
        if (evt.filePath) {
          const lang = detectLanguage(evt.filePath);
          monaco.editor.setModelLanguage(model, lang);
        }
        break;
      }
    }
  }

  function detectLanguage(filePath) {
    const ext = (filePath.split('.').pop() || '').toLowerCase();
    const map = {
      ts: 'typescript', tsx: 'typescript',
      js: 'javascript', jsx: 'javascript',
      py: 'python',     java: 'java',
      cpp: 'cpp',       c: 'c',
      cs: 'csharp',     go: 'go',
      rs: 'rust',       rb: 'ruby',
      php: 'php',       html: 'html',
      css: 'css',       json: 'json',
      md: 'markdown',
    };
    return map[ext] || 'plaintext';
  }
}());
</script>
</body>
</html>`;
}
// ── helpers ───────────────────────────────────────────────────────────────────
function detectLanguage(filePath) {
    const ext = (filePath.split('.').pop() ?? '').toLowerCase();
    const map = {
        ts: 'typescript', tsx: 'typescript',
        js: 'javascript', jsx: 'javascript',
        py: 'python', java: 'java',
        cpp: 'cpp', c: 'c',
        cs: 'csharp', go: 'go',
        rs: 'rust', rb: 'ruby',
        php: 'php', html: 'html',
        css: 'css', json: 'json',
        md: 'markdown',
    };
    return map[ext] ?? 'plaintext';
}
//# sourceMappingURL=PlaybackPanel.js.map