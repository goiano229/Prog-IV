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
exports.SyncManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const ApiClient_1 = require("./ApiClient");
const SYNC_INTERVAL_MS = 30000;
const PENDING_FILE = '.codetrack/pending.json';
const MAX_RETRY_DELAY_MS = 64000;
/**
 * Periodically flushes the SessionBuffer and POSTs events to the backend.
 *
 * Triggers:
 *  - Every 30 seconds (interval timer)
 *  - On every onDidSaveTextDocument
 *  - Manually via flushAndSync() (called on stop)
 *
 * On network/HTTP failure:
 *  - Events are re-queued in memory for the next cycle
 *  - Additionally written to .codetrack/pending.json in the workspace so
 *    they survive a VS Code restart
 *  - Retry uses exponential backoff: 1 s, 2 s, 4 s … up to 64 s
 */
class SyncManager {
    constructor(sessionId, buffer, context, api) {
        this.sessionId = sessionId;
        this.buffer = buffer;
        this.context = context;
        this.api = api;
        this.timer = null;
        this.retryTimer = null;
        this.disposables = [];
        this.retryDelayMs = 1000;
    }
    start() {
        this.loadPending();
        this.timer = setInterval(() => void this.sync(), SYNC_INTERVAL_MS);
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(() => void this.sync()));
    }
    stop() {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.retryTimer !== null) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
    }
    async flushAndSync() {
        await this.sync();
    }
    // ── private ──────────────────────────────────────────────────────────────────
    async sync() {
        const events = this.buffer.flush();
        if (events.length === 0) {
            return;
        }
        const jwt = await this.context.secrets.get('codetrack.jwt');
        if (!jwt) {
            events.forEach((e) => this.buffer.push(e));
            return;
        }
        try {
            await this.api.sendBatch(jwt, events);
            this.retryDelayMs = 1000;
            this.clearPendingFile();
        }
        catch (err) {
            if (err instanceof ApiClient_1.ApiError && err.isAuthError) {
                console.error(`[CodeTrack] sync auth error ${err.status}: ${err.message}`);
                this.clearPendingFile();
            }
            else {
                console.error('[CodeTrack] sync error:', err);
                this.onSyncFailure(events);
            }
        }
    }
    onSyncFailure(events) {
        events.forEach((e) => this.buffer.push(e));
        this.savePending(this.buffer);
        if (this.retryTimer === null) {
            this.retryTimer = setTimeout(() => {
                this.retryTimer = null;
                void this.sync();
            }, this.retryDelayMs);
            this.retryDelayMs = Math.min(this.retryDelayMs * 2, MAX_RETRY_DELAY_MS);
        }
    }
    // ── Offline persistence ───────────────────────────────────────────────────────
    pendingFilePath() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            return null;
        }
        return path.join(folders[0].uri.fsPath, PENDING_FILE);
    }
    savePending(buffer) {
        const filePath = this.pendingFilePath();
        if (!filePath) {
            return;
        }
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const events = buffer.flush();
            fs.writeFileSync(filePath, JSON.stringify(events), 'utf8');
            events.forEach((e) => buffer.push(e));
        }
        catch (err) {
            console.error('[CodeTrack] failed to persist pending events:', err);
        }
    }
    loadPending() {
        const filePath = this.pendingFilePath();
        if (!filePath || !fs.existsSync(filePath)) {
            return;
        }
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const all = JSON.parse(raw);
            if (Array.isArray(all) && all.length > 0) {
                const current = all.filter((e) => e.sessionId === this.sessionId);
                const stale = all.length - current.length;
                if (current.length > 0) {
                    current.forEach((e) => this.buffer.push(e));
                    console.log(`[CodeTrack] loaded ${current.length} pending events from disk`);
                }
                if (stale > 0) {
                    console.log(`[CodeTrack] discarded ${stale} stale pending events from previous sessions`);
                }
            }
            fs.unlinkSync(filePath);
        }
        catch (err) {
            console.error('[CodeTrack] failed to load pending events from disk:', err);
        }
    }
    clearPendingFile() {
        const filePath = this.pendingFilePath();
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            }
            catch {
                // ignore
            }
        }
    }
}
exports.SyncManager = SyncManager;
//# sourceMappingURL=SyncManager.js.map