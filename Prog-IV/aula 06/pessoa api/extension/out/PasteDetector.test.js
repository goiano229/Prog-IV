"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PasteDetector_1 = require("./PasteDetector");
const T0 = 1000000; // timestamp fictício de início de sessão
describe('PasteDetector — G2-03 (REQ-103): grace period de 2 s', () => {
    it('paste de 50 chars a t0+1s → isPaste false (dentro dos 2 s)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, T0);
        // evento anterior recente (simula digitação antes do paste)
        detector.check(1, T0 + 900);
        const { isPaste } = detector.check(50, T0 + 1000); // +100ms depois
        expect(isPaste).toBe(false);
    });
    it('paste de 50 chars a t0+3s → isPaste true (após os 2 s)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, T0);
        // evento anterior recente (simula digitação logo antes do paste)
        detector.check(1, T0 + 2900);
        const { isPaste } = detector.check(50, T0 + 3000); // +100ms depois
        expect(isPaste).toBe(true);
    });
    it('exatamente em 2 000 ms → isPaste true (limite inclusivo)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, T0);
        detector.check(1, T0 + 1900);
        const { isPaste } = detector.check(50, T0 + 2000); // nowMs - sessionStartMs === 2000 → >= 2000, true
        // A condição é >= 2_000, portanto exatamente 2s JÁ detecta
        expect(isPaste).toBe(true);
    });
    it('paste com charCount <= 20 após 3s → isPaste false (volume insuficiente)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, T0);
        detector.check(1, T0 + 2900);
        const { isPaste } = detector.check(20, T0 + 3000); // charCount não é > 20
        expect(isPaste).toBe(false);
    });
    it('paste após 3s mas timeSinceLastEvent >= 200ms → isPaste false (velocidade lenta)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, T0);
        detector.check(1, T0 + 2000);
        const { isPaste } = detector.check(50, T0 + 3000); // 1000ms desde último evento
        expect(isPaste).toBe(false);
    });
});
//# sourceMappingURL=PasteDetector.test.js.map