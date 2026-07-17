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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const crypto_1 = require("crypto");
const AuthManager_1 = require("./auth/AuthManager");
const EventRecorder_1 = require("./recorder/EventRecorder");
const PasteDetector_1 = require("./recorder/PasteDetector");
const SessionBuffer_1 = require("./recorder/SessionBuffer");
const ApiClient_1 = require("./sync/ApiClient");
const SyncManager_1 = require("./sync/SyncManager");
const PlaybackPanel_1 = require("./playback/PlaybackPanel");
const StatusBar_1 = require("./ui/StatusBar");
// ── module-level recording state ──────────────────────────────────────────────
let recorder = null;
let syncManager = null;
let statusBar;
let activeSessionId = null;
let authManager;
// ── activation ────────────────────────────────────────────────────────────────
function activate(context) {
    authManager = new AuthManager_1.AuthManager(context);
    statusBar = new StatusBar_1.StatusBar();
    context.subscriptions.push({ dispose: () => statusBar.dispose() });
    // First-run privacy consent
    const consented = context.globalState.get('codetrack.consented');
    if (!consented) {
        void vscode.window
            .showInformationMessage('CodeTrack: esta extensão registra suas edições de código para análise pedagógica. ' +
            'Ao usar "Start Recording" você concorda com a gravação.', 'Entendi')
            .then(() => context.globalState.update('codetrack.consented', true));
    }
    context.subscriptions.push(vscode.commands.registerCommand('codetrack.login', () => void authManager.login(makeApiClient())), vscode.commands.registerCommand('codetrack.logout', () => void handleLogout()), vscode.commands.registerCommand('codetrack.setApiUrl', () => void handleSetApiUrl()), vscode.commands.registerCommand('codetrack.startRecording', () => void startRecording(context)), vscode.commands.registerCommand('codetrack.stopRecording', () => void stopRecording(context)), vscode.commands.registerCommand('codetrack.playback', () => void openPlayback(context)), vscode.commands.registerCommand('codetrack.syncNow', () => {
        if (syncManager) {
            void syncManager.flushAndSync();
        }
        else {
            vscode.window.showWarningMessage('CodeTrack: gravação não está ativa.');
        }
    }), vscode.commands.registerCommand('codetrack.resetConsent', () => {
        void context.globalState.update('codetrack.consented', undefined).then(() => {
            vscode.window.showInformationMessage('CodeTrack: consentimento redefinido. Recarregue a janela para testar novamente.');
        });
    }));
}
function deactivate() {
    recorder?.stop();
    syncManager?.stop();
}
// ── auto-closing helpers ──────────────────────────────────────────────────────
const AUTO_CLOSING_SETTINGS = [
    'editor.autoClosingBrackets',
    'editor.autoClosingQuotes',
];
let savedAutoClosingValues = {};
async function disableAutoClosing() {
    const config = vscode.workspace.getConfiguration();
    savedAutoClosingValues = {};
    for (const key of AUTO_CLOSING_SETTINGS) {
        savedAutoClosingValues[key] = config.get(key);
        await config.update(key, 'never', vscode.ConfigurationTarget.Global);
    }
}
async function restoreAutoClosing() {
    const config = vscode.workspace.getConfiguration();
    for (const key of AUTO_CLOSING_SETTINGS) {
        await config.update(key, savedAutoClosingValues[key], vscode.ConfigurationTarget.Global);
    }
    savedAutoClosingValues = {};
}
// ── commands ──────────────────────────────────────────────────────────────────
async function startRecording(context) {
    if (recorder) {
        vscode.window.showWarningMessage('CodeTrack: gravação já está em andamento.');
        return;
    }
    const api = makeApiClient();
    let jwt = await authManager.getToken();
    if (!jwt) {
        const ok = await authManager.login(api);
        if (!ok) {
            return;
        }
        jwt = (await authManager.getToken());
    }
    const activityCode = await vscode.window.showInputBox({
        prompt: 'Código da atividade (fornecido pelo professor)',
        placeHolder: 'Ex: A1B2C3D4',
        ignoreFocusOut: true,
    });
    if (!activityCode) {
        return;
    }
    const enrolled = await checkEnrollment(api, jwt, activityCode.toUpperCase());
    if (!enrolled) {
        return;
    }
    const session = await createSession(api, jwt, activityCode.toUpperCase());
    if (!session) {
        return;
    }
    // Check for divergence with previous session
    if (session.activityId) {
        await checkTextDivergence(api, jwt, session.activityId);
    }
    activeSessionId = session.id;
    const buffer = new SessionBuffer_1.SessionBuffer();
    const pasteDetector = new PasteDetector_1.PasteDetector();
    recorder = new EventRecorder_1.EventRecorder(activeSessionId, buffer, pasteDetector);
    syncManager = new SyncManager_1.SyncManager(activeSessionId, buffer, context, api);
    // Snapshot must be the first event — push before recorder.start()
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const content = activeEditor.document.getText();
        if (content.length > 0) {
            buffer.push({
                id: (0, crypto_1.randomUUID)(),
                sessionId: activeSessionId,
                type: 'FULL_CONTENT',
                timestampMs: Date.now(),
                filePath: activeEditor.document.fileName,
                textContent: content,
                charCount: content.length,
                isPaste: false,
                pasteScore: 0,
            });
        }
    }
    recorder.start();
    syncManager.start();
    await disableAutoClosing();
    statusBar.showRecording(activeSessionId);
    vscode.window.showInformationMessage(`CodeTrack: gravação iniciada — código "${activityCode}".`);
}
async function stopRecording(context) {
    if (!recorder || !activeSessionId) {
        vscode.window.showWarningMessage('CodeTrack: not currently recording.');
        return;
    }
    recorder.stop();
    recorder = null;
    await syncManager.flushAndSync();
    syncManager.stop();
    syncManager = null;
    const api = makeApiClient();
    const jwt = await context.secrets.get('codetrack.jwt');
    if (jwt) {
        try {
            await api.endSession(jwt, activeSessionId);
        }
        catch {
            // ignore — session will remain open server-side
        }
    }
    activeSessionId = null;
    statusBar.showIdle();
    await restoreAutoClosing();
    vscode.window.showInformationMessage('CodeTrack: recording stopped.');
}
// ── helpers ───────────────────────────────────────────────────────────────────
function makeApiClient() {
    const url = vscode.workspace
        .getConfiguration('codetrack')
        .get('apiUrl', 'http://localhost:3000/api');
    return new ApiClient_1.ApiClient(url);
}
async function handleLogout() {
    if (recorder) {
        vscode.window.showWarningMessage('CodeTrack: pare a gravação antes de fazer logout.');
        return;
    }
    await authManager.logout();
}
async function handleSetApiUrl() {
    const current = vscode.workspace
        .getConfiguration('codetrack')
        .get('apiUrl', 'http://localhost:3000/api');
    const newUrl = await vscode.window.showInputBox({
        prompt: 'URL da API do CodeTrack (sem barra no final)',
        placeHolder: 'http://localhost:3000/api',
        value: current,
        ignoreFocusOut: true,
    });
    if (newUrl === undefined) {
        return;
    }
    const trimmed = newUrl.trim().replace(/\/$/, '');
    await vscode.workspace
        .getConfiguration('codetrack')
        .update('apiUrl', trimmed, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`CodeTrack: URL da API definida para "${trimmed}".`);
}
async function checkEnrollment(api, jwt, activityCode) {
    try {
        const enrolled = await api.checkEnrollment(jwt, activityCode);
        if (!enrolled) {
            vscode.window.showErrorMessage(`CodeTrack: você não está inscrito na turma desta atividade (${activityCode}). ` +
                'Solicite ao professor que verifique sua inscrição.');
            return false;
        }
        return true;
    }
    catch (err) {
        if (err instanceof ApiClient_1.ApiError) {
            if (err.status === 401) {
                await authManager.clearToken();
                vscode.window.showErrorMessage('CodeTrack: sessão expirada. Execute "Start Recording" novamente para fazer login.');
            }
            else {
                vscode.window.showErrorMessage(`CodeTrack: ${err.message}`);
            }
        }
        else {
            vscode.window.showErrorMessage('CodeTrack: não foi possível verificar a inscrição na turma.');
        }
        return false;
    }
}
async function openPlayback(context) {
    PlaybackPanel_1.PlaybackPanel.createOrShow(context, []);
}
async function createSession(api, jwt, activityCode) {
    try {
        const session = await api.createSession(jwt, activityCode);
        return session;
    }
    catch (err) {
        if (err instanceof ApiClient_1.ApiError) {
            if (err.status === 401) {
                await authManager.clearToken();
                vscode.window.showErrorMessage('CodeTrack: session expired. Run "Start Recording" again to log in.');
            }
            else {
                vscode.window.showErrorMessage(`CodeTrack: ${err.message}`);
            }
        }
        else {
            vscode.window.showErrorMessage(`CodeTrack: cannot reach server.`);
        }
        return null;
    }
}
async function checkTextDivergence(api, jwt, activityId) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor)
        return;
    let previous;
    try {
        previous = await api.getPreviousContent(jwt, activityId);
    }
    catch {
        return;
    }
    if (!previous.sessionId || previous.finalText === null)
        return;
    const currentText = activeEditor.document.getText();
    if (currentText === previous.finalText)
        return;
    const currentLines = currentText.split('\n').length;
    const prevLines = previous.finalText.split('\n').length;
    const lineDiff = currentLines - prevLines;
    const diffMsg = lineDiff === 0
        ? 'mesmo número de linhas, mas conteúdo diferente'
        : lineDiff > 0
            ? `+${lineDiff} linha(s) a mais`
            : `${lineDiff} linha(s) a menos`;
    vscode.window.showWarningMessage(`CodeTrack: o texto atual difere da última sessão encerrada (${diffMsg}). ` +
        `Verifique se o arquivo foi editado fora da gravação.`, 'Entendi');
}
//# sourceMappingURL=extension.js.map