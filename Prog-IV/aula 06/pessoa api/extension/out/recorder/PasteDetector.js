"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasteDetector = void 0;
/**
 * Tracks timing between text-change events and decides whether a given
 * insertion looks like a paste.
 *
 * Constructor params (all optional, falling back to spec defaults):
 *   minChars        – minimum char count to flag as paste (spec §4.1: 20)
 *   thresholdMs     – max ms since last event to flag as paste (spec §4.1: 200)
 *   pasteThreshold  – minimum pasteScore to confirm paste (spec §4.1: 0.7)
 *   volumeOnlyChars – charCount above this value triggers isPaste regardless
 *                     of speed (handles paste after a long pause). Default: 200
 *   sessionStartMs  – timestamp of session start; first 2 000 ms are ignored
 *                     to avoid false positives on initial file load
 *
 * pasteScore = (volumeScore * 0.6) + (speedScore * 0.4)
 * isPaste    = pasteScore >= pasteThreshold  OR  charCount > volumeOnlyChars
 */
class PasteDetector {
    constructor(minChars = 20, thresholdMs = 200, pasteThreshold = 0.7, volumeOnlyChars = 20, sessionStartMs = Date.now()) {
        this.minChars = minChars;
        this.thresholdMs = thresholdMs;
        this.pasteThreshold = pasteThreshold;
        this.volumeOnlyChars = volumeOnlyChars;
        this.lastEventMs = 0;
        this.sessionStartMs = sessionStartMs;
    }
    check(charCount, nowMs = Date.now()) {
        const timeSinceLastEvent = this.lastEventMs > 0 ? nowMs - this.lastEventMs : Number.MAX_SAFE_INTEGER;
        this.lastEventMs = nowMs;
        // Ignore the first 2 000 ms of the session (initial file load)
        const inGracePeriod = nowMs - this.sessionStartMs < 2000;
        if (inGracePeriod) {
            return { isPaste: false, pasteScore: 0, timeSinceLastEvent };
        }
        const volumeScore = this.computeVolumeScore(charCount);
        const speedScore = this.computeSpeedScore(timeSinceLastEvent);
        const pasteScore = volumeScore * 0.6 + speedScore * 0.4;
        // Volume-only path: very large insertions are paste regardless of timing
        // (covers paste after a long pause where speedScore would be 0).
        const isPaste = pasteScore >= this.pasteThreshold || charCount > this.volumeOnlyChars;
        return { isPaste, pasteScore, timeSinceLastEvent };
    }
    reset() {
        this.lastEventMs = 0;
    }
    // ── private ──────────────────────────────────────────────────────────────────
    /**
     * Returns 0–1 based on how many characters were inserted relative to
     * the minimum paste threshold. Saturates at 5× the minimum.
     */
    computeVolumeScore(charCount) {
        if (charCount <= this.minChars) {
            return 0;
        }
        return Math.min(1, (charCount - this.minChars) / (this.minChars * 4));
    }
    /**
     * Returns 0–1 based on how fast the insertion arrived relative to
     * the speed threshold. 0 ms → 1.0; >= thresholdMs → 0.0.
     */
    computeSpeedScore(timeSinceLastEvent) {
        if (timeSinceLastEvent >= this.thresholdMs) {
            return 0;
        }
        return 1 - timeSinceLastEvent / this.thresholdMs;
    }
}
exports.PasteDetector = PasteDetector;
//# sourceMappingURL=PasteDetector.js.map