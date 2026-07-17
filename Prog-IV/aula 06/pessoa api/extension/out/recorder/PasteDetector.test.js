"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PasteDetector_1 = require("./PasteDetector");
const T0 = 1000000;
describe('PasteDetector — grace period de 2 s', () => {
    it('paste de 50 chars a t0+1s → isPaste false (dentro dos 2 s)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, T0);
        detector.check(1, T0 + 900);
        const { isPaste, pasteScore } = detector.check(50, T0 + 1000);
        expect(isPaste).toBe(false);
        expect(pasteScore).toBe(0);
    });
    it('paste de 50 chars a t0+3s → isPaste true (após os 2 s)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, T0);
        detector.check(1, T0 + 2900);
        const { isPaste, pasteScore } = detector.check(50, T0 + 3000);
        expect(isPaste).toBe(true);
        expect(pasteScore).toBeGreaterThanOrEqual(0.7);
    });
    it('exatamente em 2 000 ms → isPaste true (limite inclusivo)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, T0);
        detector.check(1, T0 + 1900);
        const { isPaste } = detector.check(50, T0 + 2000);
        expect(isPaste).toBe(true);
    });
    it('charCount <= 20 após 3s → isPaste false (volume insuficiente)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, T0);
        detector.check(1, T0 + 2900);
        const { isPaste, pasteScore } = detector.check(20, T0 + 3000);
        expect(isPaste).toBe(false);
        expect(pasteScore).toBe(0);
    });
    it('timeSinceLastEvent >= 200ms → isPaste false (velocidade lenta)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, T0);
        detector.check(1, T0 + 2000);
        const { isPaste, pasteScore } = detector.check(50, T0 + 3000);
        expect(isPaste).toBe(false);
        expect(pasteScore).toBeLessThan(0.7);
    });
});
describe('PasteDetector — volume-only path (charCount > volumeOnlyChars)', () => {
    it('541 chars com timeSinceLast=8865ms → isPaste true (volume acima de 200)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, 20, T0);
        detector.check(1, T0 + 2000);
        const { isPaste, pasteScore } = detector.check(541, T0 + 2000 + 8865);
        // speedScore = 0 (8865 >> 200ms), mas charCount 541 > volumeOnlyChars 200
        expect(isPaste).toBe(true);
        expect(pasteScore).toBe(0.6); // só volumeScore contribui
    });
    it('20 chars com timeSinceLast=8865ms → isPaste false (não ultrapassa volume-only de 20)', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, 20, T0);
        detector.check(1, T0 + 2000);
        const { isPaste } = detector.check(20, T0 + 2000 + 8865);
        expect(isPaste).toBe(false);
    });
    it('201 chars ainda no grace period → isPaste false', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, 20, T0);
        const { isPaste } = detector.check(541, T0 + 500);
        expect(isPaste).toBe(false);
    });
});
describe('PasteDetector — pasteScore = (volumeScore * 0.6) + (speedScore * 0.4)', () => {
    it('charCount muito alto e tempo muito baixo → pasteScore próximo de 1', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, T0);
        detector.check(1, T0 + 2990);
        // 500 chars (muito acima do mínimo), 10ms de intervalo
        const { pasteScore } = detector.check(500, T0 + 3000);
        expect(pasteScore).toBeGreaterThan(0.9);
    });
    it('charCount = 21 (mínimo + 1) → volumeScore baixo → pasteScore baixo', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, T0);
        detector.check(1, T0 + 2990);
        const { pasteScore } = detector.check(21, T0 + 3000);
        // volumeScore = (21 - 20) / 80 = 0.0125, speedScore ≈ 0.95
        // pasteScore ≈ 0.0125*0.6 + 0.95*0.4 ≈ 0.387
        expect(pasteScore).toBeLessThan(0.7);
    });
    it('reset limpa o estado de timing', () => {
        const detector = new PasteDetector_1.PasteDetector(20, 200, 0.7, T0);
        detector.check(1, T0 + 2900);
        detector.reset();
        // Após reset, timeSinceLastEvent = MAX_SAFE_INTEGER → speedScore = 0
        const { isPaste, pasteScore } = detector.check(500, T0 + 3000);
        expect(isPaste).toBe(false);
        expect(pasteScore).toBeLessThan(0.7);
    });
});
//# sourceMappingURL=PasteDetector.test.js.map