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
exports.EventRecorder = void 0;
const vscode = __importStar(require("vscode"));
const crypto_1 = require("crypto");
const TEXT_CONTENT_MAX = 1000;
/**
 * Listens to VS Code document events and pushes CodeEvent objects into the
 * SessionBuffer.  One instance per active recording session.
 */
class EventRecorder {
    constructor(sessionId, buffer, pasteDetector) {
        this.sessionId = sessionId;
        this.buffer = buffer;
        this.pasteDetector = pasteDetector;
        this.disposables = [];
        this.debugStartTimes = new Map();
    }
    start() {
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(this.onTextChange, this), vscode.workspace.onDidOpenTextDocument(this.onFileOpen, this), vscode.workspace.onDidSaveTextDocument(this.onFileSave, this), vscode.debug.onDidStartDebugSession(this.onDebugStart, this), vscode.debug.onDidTerminateDebugSession(this.onDebugEnd, this));
    }
    stop() {
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
        this.pasteDetector.reset();
        this.debugStartTimes.clear();
    }
    // ── private handlers ───────────────────────────────────────────────────────
    onTextChange(e) {
        const nowMs = Date.now();
        for (const change of e.contentChanges) {
            const charCount = change.text.length;
            const { isPaste, pasteScore, timeSinceLastEvent } = this.pasteDetector.check(charCount, nowMs);
            let type;
            if (charCount === 0) {
                type = 'DELETE';
            }
            else if (isPaste) {
                type = 'PASTE';
            }
            else {
                type = 'INSERT';
            }
            const event = {
                id: (0, crypto_1.randomUUID)(),
                sessionId: this.sessionId,
                type,
                timestampMs: nowMs,
                filePath: e.document.fileName,
                rangeStart: {
                    line: change.range.start.line,
                    character: change.range.start.character,
                },
                rangeEnd: {
                    line: change.range.end.line,
                    character: change.range.end.character,
                },
                textContent: change.text.slice(0, TEXT_CONTENT_MAX),
                charCount,
                isPaste,
                pasteScore,
                timeSinceLastEvent: Math.round(timeSinceLastEvent === Number.MAX_SAFE_INTEGER ? 9999999 : timeSinceLastEvent),
            };
            this.buffer.push(event);
        }
    }
    onFileOpen(doc) {
        this.buffer.push({
            id: (0, crypto_1.randomUUID)(),
            sessionId: this.sessionId,
            type: 'FILE_OPEN',
            timestampMs: Date.now(),
            filePath: doc.fileName,
            isPaste: false,
            pasteScore: 0,
        });
    }
    onFileSave(doc) {
        this.buffer.push({
            id: (0, crypto_1.randomUUID)(),
            sessionId: this.sessionId,
            type: 'FILE_SAVE',
            timestampMs: Date.now(),
            filePath: doc.fileName,
            isPaste: false,
            pasteScore: 0,
        });
    }
    onDebugStart(session) {
        const nowMs = Date.now();
        this.debugStartTimes.set(session.id, nowMs);
        this.buffer.push({
            id: (0, crypto_1.randomUUID)(),
            sessionId: this.sessionId,
            type: 'DEBUG_START',
            timestampMs: nowMs,
            filePath: vscode.window.activeTextEditor?.document.fileName,
            isPaste: false,
            pasteScore: 0,
            debugType: session.type,
            debugName: session.name,
        });
    }
    onDebugEnd(session) {
        const nowMs = Date.now();
        const startMs = this.debugStartTimes.get(session.id);
        this.debugStartTimes.delete(session.id);
        this.buffer.push({
            id: (0, crypto_1.randomUUID)(),
            sessionId: this.sessionId,
            type: 'DEBUG_END',
            timestampMs: nowMs,
            filePath: vscode.window.activeTextEditor?.document.fileName,
            isPaste: false,
            pasteScore: 0,
            debugType: session.type,
            debugName: session.name,
            debugDurationMs: startMs !== undefined ? nowMs - startMs : undefined,
        });
    }
}
exports.EventRecorder = EventRecorder;
//# sourceMappingURL=EventRecorder.js.map