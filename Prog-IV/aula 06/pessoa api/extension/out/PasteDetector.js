"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasteDetector = void 0;
/**
 * Tracks timing between text-change events and decides whether a given
 * insertion looks like a paste.
 *
 * Constructor params (all optional, falling back to spec defaults):
 *   minChars    – minimum char count to flag as paste (spec §9.1: 20)
 *   thresholdMs – max ms since last event to flag as paste (spec §9.1: 200)
 *   sessionStartMs – timestamp of session start; first 2 000 ms are ignored
 *                    to avoid false positives on initial file load (spec §9.2)
 *
 * timeSinceLastEvent is also returned so the backend can recompute pasteScore.
 */
class PasteDetector {
    constructor(minChars = 20, thresholdMs = 200, sessionStartMs = Date.now()) {
        this.minChars = minChars;
        this.thresholdMs = thresholdMs;
        this.lastEventMs = 0;
        this.sessionStartMs = sessionStartMs;
    }
    check(charCount, nowMs = Date.now()) {
        const timeSinceLastEvent = this.lastEventMs > 0 ? nowMs - this.lastEventMs : Number.MAX_SAFE_INTEGER;
        this.lastEventMs = nowMs;
        // Ignore the first 2 000 ms of the session (initial file load — spec §9.2)
        const isPaste = nowMs - this.sessionStartMs >= 2000 &&
            charCount > this.minChars &&
            timeSinceLastEvent < this.thresholdMs;
        return { isPaste, timeSinceLastEvent };
    }
    reset() {
        this.lastEventMs = 0;
    }
}
exports.PasteDetector = PasteDetector;
//# sourceMappingURL=PasteDetector.js.map