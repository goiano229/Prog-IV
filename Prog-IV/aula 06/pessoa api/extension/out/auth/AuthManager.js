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
const ApiClient_1 = require("../sync/ApiClient");
class AuthManager {
    constructor(context) {
        this.context = context;
    }
    async login(api) {
        const email = await vscode.window.showInputBox({
            prompt: 'CodeTrack — e-mail',
            placeHolder: 'aluno@exemplo.com',
            ignoreFocusOut: true,
        });
        if (!email) {
            return false;
        }
        const password = await vscode.window.showInputBox({
            prompt: 'CodeTrack — senha',
            password: true,
            ignoreFocusOut: true,
        });
        if (!password) {
            return false;
        }
        try {
            const { token } = await api.login(email, password);
            await this.context.secrets.store('codetrack.jwt', token);
            vscode.window.showInformationMessage('CodeTrack: login realizado com sucesso.');
            return true;
        }
        catch (err) {
            if (err instanceof ApiClient_1.ApiError) {
                if (err.isAuthError) {
                    vscode.window.showErrorMessage('CodeTrack: e-mail ou senha incorretos.');
                }
                else {
                    vscode.window.showErrorMessage(`CodeTrack: erro no servidor (${err.status}).`);
                }
            }
            else {
                vscode.window.showErrorMessage('CodeTrack: não foi possível conectar ao servidor.');
            }
            return false;
        }
    }
    async logout() {
        await this.context.secrets.delete('codetrack.jwt');
        vscode.window.showInformationMessage('CodeTrack: logout realizado.');
    }
    async getToken() {
        return this.context.secrets.get('codetrack.jwt');
    }
    async clearToken() {
        await this.context.secrets.delete('codetrack.jwt');
    }
}
exports.AuthManager = AuthManager;
//# sourceMappingURL=AuthManager.js.map