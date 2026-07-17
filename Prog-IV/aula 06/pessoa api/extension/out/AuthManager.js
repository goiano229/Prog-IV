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
exports.AuthManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Manages authentication: prompts the user for credentials (email, password,
 * and optional class join code), calls POST /auth/login, and persists the JWT
 * in VS Code's SecretStorage.
 */
class AuthManager {
    constructor(context) {
        this.context = context;
    }
    /**
     * Runs the full login flow. Returns true when the JWT was successfully
     * obtained and stored, false if the user cancelled or credentials failed.
     */
    async login(apiUrl) {
        const email = await vscode.window.showInputBox({
            prompt: 'CodeTrack — email',
            placeHolder: 'student@example.com',
            ignoreFocusOut: true,
        });
        if (!email) {
            return false;
        }
        const password = await vscode.window.showInputBox({
            prompt: 'CodeTrack — password',
            password: true,
            ignoreFocusOut: true,
        });
        if (!password) {
            return false;
        }
        const joinCode = await vscode.window.showInputBox({
            prompt: 'Class join code (optional — press Enter to skip)',
            ignoreFocusOut: true,
        });
        let res;
        try {
            res = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
        }
        catch {
            vscode.window.showErrorMessage(`CodeTrack: cannot reach ${apiUrl}`);
            return false;
        }
        if (!res.ok) {
            vscode.window.showErrorMessage('CodeTrack: invalid credentials.');
            return false;
        }
        const { token } = (await res.json());
        await this.context.secrets.store('codetrack.jwt', token);
        if (joinCode?.trim()) {
            await this.context.secrets.store('codetrack.joinCode', joinCode.trim().toUpperCase());
        }
        vscode.window.showInformationMessage('CodeTrack: logged in successfully.');
        return true;
    }
    async getToken() {
        return this.context.secrets.get('codetrack.jwt');
    }
    /** Returns the last join code entered during login, if any. */
    async getJoinCode() {
        return this.context.secrets.get('codetrack.joinCode');
    }
    async clearToken() {
        await this.context.secrets.delete('codetrack.jwt');
    }
}
exports.AuthManager = AuthManager;
//# sourceMappingURL=AuthManager.js.map