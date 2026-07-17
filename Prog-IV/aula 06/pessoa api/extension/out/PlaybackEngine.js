"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybackEngine = void 0;
/**
 * Drives event-based playback of a recorded coding session.
 *
 * Timing is derived from the `timestampMs` deltas between consecutive events
 * and divided by `speedFactor` (0.5× … 10×). The engine runs entirely in the
 * extension host and delivers each event through the `onEvent` callback so the
 * caller (e.g. PlaybackPanel) can forward it to the WebView.
 */
class PlaybackEngine {
    constructor(events, onEvent) {
        this.events = events;
        this.onEvent = onEvent;
        this.position = 0;
        this._isPlaying = false;
        this.timer = null;
        this._speedFactor = 1;
        // Used to reschedule the pending timer when speed changes mid-playback.
        this.pendingRawDelay = 0;
        this.pendingScheduledAt = 0;
    }
    get isPlaying() {
        return this._isPlaying;
    }
    get speedFactor() {
        return this._speedFactor;
    }
    get progress() {
        return { current: this.position, total: this.events.length };
    }
    play() {
        if (this._isPlaying || this.position >= this.events.length) {
            return;
        }
        this._isPlaying = true;
        this.scheduleNext();
    }
    pause() {
        this._isPlaying = false;
        this.clearTimer();
    }
    /**
     * Updates the playback speed. If currently playing, the pending timer is
     * rescheduled immediately using the remaining logical delay at the new rate.
     *
     * @param factor — value clamped to [0.5, 10]
     */
    setSpeed(factor) {
        const clamped = Math.min(10, Math.max(0.5, factor));
        if (clamped === this._speedFactor) {
            return;
        }
        if (this._isPlaying && this.timer !== null) {
            // How much logical time has already elapsed for the pending gap?
            const wallElapsed = Date.now() - this.pendingScheduledAt;
            const logicalElapsed = wallElapsed * this._speedFactor;
            const remainingLogical = Math.max(0, this.pendingRawDelay - logicalElapsed);
            this._speedFactor = clamped;
            this.clearTimer();
            this.timer = setTimeout(() => {
                this.timer = null;
                this.scheduleNext();
            }, remainingLogical / this._speedFactor);
        }
        else {
            this._speedFactor = clamped;
        }
    }
    reset() {
        this.pause();
        this.position = 0;
    }
    // ── private ─────────────────────────────────────────────────────────────────
    /**
     * Dispatches the event at `this.position`, then schedules the call that will
     * dispatch the next event after the appropriate delay.
     */
    scheduleNext() {
        if (!this._isPlaying || this.position >= this.events.length) {
            this._isPlaying = false;
            return;
        }
        const current = this.events[this.position];
        this.onEvent(current);
        this.position++;
        if (this.position >= this.events.length) {
            this._isPlaying = false;
            return;
        }
        const next = this.events[this.position];
        const rawDelay = Math.max(0, next.timestampMs - current.timestampMs);
        this.pendingRawDelay = rawDelay;
        this.pendingScheduledAt = Date.now();
        this.timer = setTimeout(() => {
            this.timer = null;
            this.scheduleNext();
        }, rawDelay / this._speedFactor);
    }
    clearTimer() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
exports.PlaybackEngine = PlaybackEngine;
//# sourceMappingURL=PlaybackEngine.js.map