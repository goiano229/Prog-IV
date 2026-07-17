"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = exports.ApiClient = void 0;
/**
 * Thin HTTP client for the CodeTrack backend API.
 * All fetch calls are centralised here so SyncManager and AuthManager
 * don't embed raw fetch logic.
 */
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async login(email, password) {
        const res = await this.request('POST', '/auth/login', { email, password });
        if (!res.ok) {
            throw new ApiError(res.status, await res.text().catch(() => String(res.status)));
        }
        return res.json();
    }
    async checkEnrollment(jwt, activityCode) {
        const res = await this.request('GET', `/enrollments/check?activityCode=${encodeURIComponent(activityCode.toUpperCase())}`, undefined, jwt);
        if (res.status === 200)
            return true;
        if (res.status === 403 || res.status === 404)
            return false;
        throw new ApiError(res.status, await res.text().catch(() => String(res.status)));
    }
    async createSession(jwt, activityCode) {
        const body = { activityCode: activityCode.toUpperCase() };
        const res = await this.request('POST', '/sessions', body, jwt);
        if (!res.ok) {
            throw new ApiError(res.status, await res.text().catch(() => String(res.status)));
        }
        return res.json();
    }
    async getPreviousContent(jwt, activityId) {
        const res = await this.request('GET', `/sessions/previous-content?activityId=${encodeURIComponent(activityId)}`, undefined, jwt);
        if (!res.ok)
            return { sessionId: null, finalText: null };
        return res.json();
    }
    async endSession(jwt, sessionId) {
        const res = await this.request('PATCH', `/sessions/${sessionId}/end`, undefined, jwt);
        if (!res.ok && res.status !== 404) {
            throw new ApiError(res.status, await res.text().catch(() => String(res.status)));
        }
    }
    async sendBatch(jwt, events) {
        const mapped = events.map((e) => ({
            id: e.id,
            sessionId: e.sessionId,
            type: e.type,
            timestampMs: e.timestampMs,
            filePath: e.filePath,
            // VS Code lines are 0-indexed; backend/dashboard use 1-indexed lines.
            rangeStartLine: e.rangeStart !== undefined ? e.rangeStart.line + 1 : undefined,
            rangeStartChar: e.rangeStart?.character,
            rangeEndLine: e.rangeEnd !== undefined ? e.rangeEnd.line + 1 : undefined,
            rangeEndChar: e.rangeEnd?.character,
            textContent: e.textContent,
            charCount: e.charCount,
            isPaste: e.isPaste,
            pasteScore: e.pasteScore,
            timeSinceLastEvent: e.timeSinceLastEvent,
        }));
        const res = await this.request('POST', '/events/batch', { events: mapped }, jwt);
        if (!res.ok) {
            throw new ApiError(res.status, await res.text().catch(() => String(res.status)));
        }
    }
    // ── private ──────────────────────────────────────────────────────────────────
    request(method, path, body, jwt) {
        const headers = { 'Content-Type': 'application/json' };
        if (jwt) {
            headers['Authorization'] = `Bearer ${jwt}`;
        }
        return fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    }
}
exports.ApiClient = ApiClient;
class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
    get isAuthError() {
        return this.status === 401 || this.status === 403;
    }
}
exports.ApiError = ApiError;
//# sourceMappingURL=ApiClient.js.map