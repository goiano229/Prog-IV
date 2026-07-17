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
const SYNC_INTERVAL_MS = 30000;
const PENDING_FILE = '.codetrack/pending.json';
/** Maximum retry delay in ms (caps the exponential backoff). */
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
    constructor(buffer, context, apiUrl) {
        this.buffer = buffer;
        this.context = context;
        this.apiUrl = apiUrl;
        this.timer = null;
        this.retryTimer = null;
        this.disposables = [];
        this.retryDelayMs = 1000;
    }
    start() {
        // Load any events that survived a previous VS Code session
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
    /** Flush whatever is in the buffer right now and send it. */
    async flushAndSync() {
        await this.sync();
    }
    // ── private ──────────────────────────────────────────────────────────────
    async sync() {
        const events = this.buffer.flush();
        if (events.length === 0) {
            return;
        }
        const jwt = await this.context.secrets.get('codetrack.jwt');
        if (!jwt) {
            // No token — re-queue so they are not lost
            events.forEach((e) => this.buffer.push(e));
            return;
        }
        try {
            const res = await fetch(`${this.apiUrl}/events/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ events }),
            });
            if (res.ok) {
                // Success — reset backoff and clear any persisted pending file
                this.retryDelayMs = 1000;
                this.clearPendingFile();
            }
            else if (res.status === 403 || res.status === 401) {
                // Auth/ownership error — retrying will never succeed; discard events
                const text = await res.text().catch(() => String(res.status));
                console.error(`[CodeTrack] sync failed ${res.status}: ${text}`);
                this.clearPendingFile();
            }
            else {
                const text = await res.text().catch(() => String(res.status));
                console.error(`[CodeTrack] sync failed ${res.status}: ${text}`);
                this.onSyncFailure(events);
            }
        }
        catch (err) {
            console.error('[CodeTrack] sync error:', err);
            this.onSyncFailure(events);
        }
    }
    onSyncFailure(events) {
        // Re-queue in memory
        events.forEach((e) => this.buffer.push(e));
        // Persist to disk so events survive a VS Code restart
        this.savePending(this.buffer);
        // Schedule a retry with exponential backoff
        if (this.retryTimer === null) {
            this.retryTimer = setTimeout(() => {
                this.retryTimer = null;
                void this.sync();
            }, this.retryDelayMs);
            this.retryDelayMs = Math.min(this.retryDelayMs * 2, MAX_RETRY_DELAY_MS);
        }
    }
    // ── Offline persistence ───────────────────────────────────────────────────
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
            // Peek at the buffer without flushing: flush() is destructive, so we
            // read the raw array via a temporary flush-and-refill approach.
            const events = buffer.flush();
            fs.writeFileSync(filePath, JSON.stringify(events), 'utf8');
            // Put them back
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
            const events = JSON.parse(raw);
            if (Array.isArray(events) && events.length > 0) {
                events.forEach((e) => this.buffer.push(e));
                console.log(`[CodeTrack] loaded ${events.length} pending events from disk`);
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