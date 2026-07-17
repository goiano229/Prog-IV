"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionBuffer = void 0;
/** In-memory buffer for CodeEvents pending sync to the backend. */
class SessionBuffer {
    constructor() {
        this.buffer = [];
    }
    push(event) {
        this.buffer.push(event);
    }
    /**
     * Returns all buffered events and clears the buffer atomically.
     * Returns an empty array when there is nothing to sync.
     */
    flush() {
        const events = this.buffer;
        this.buffer = [];
        return events;
    }
    get size() {
        return this.buffer.length;
    }
}
exports.SessionBuffer = SessionBuffer;
//# sourceMappingURL=SessionBuffer.js.map