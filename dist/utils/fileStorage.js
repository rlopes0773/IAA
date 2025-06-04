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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class FileStorage {
    constructor() {
        this.credentialsDir = path.join(__dirname, '../../data/credentials');
        this.presentationsDir = path.join(__dirname, '../../data/presentations');
        // Criar diretórios se não existirem
        this.ensureDirectoryExists(this.credentialsDir);
        this.ensureDirectoryExists(this.presentationsDir);
    }
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    // CREDENCIAIS
    saveCredential(credentialId, credential) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(this.credentialsDir, `${credentialId}.json`);
            const data = {
                id: credentialId,
                credential: credential,
                savedAt: new Date().toISOString(),
                preview: this.generateCredentialPreview(credential)
            };
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Credencial salva em: ${filePath}`);
        });
    }
    loadCredential(credentialId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(this.credentialsDir, `${credentialId}.json`);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return data;
        });
    }
    loadAllCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = fs.readdirSync(this.credentialsDir).filter(file => file.endsWith('.json'));
            const credentials = [];
            for (const file of files) {
                const filePath = path.join(this.credentialsDir, file);
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    credentials.push(data);
                }
                catch (error) {
                    console.error(`Erro ao carregar credencial ${file}:`, error);
                }
            }
            return credentials.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        });
    }
    deleteCredential(credentialId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(this.credentialsDir, `${credentialId}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Credencial deletada: ${filePath}`);
                return true;
            }
            return false;
        });
    }
    // APRESENTAÇÕES
    savePresentation(presentationId, presentation) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(this.presentationsDir, `${presentationId}.json`);
            const data = {
                id: presentationId,
                presentation: presentation,
                savedAt: new Date().toISOString(),
                preview: this.generatePresentationPreview(presentation)
            };
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Apresentação salva em: ${filePath}`);
        });
    }
    loadPresentation(presentationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(this.presentationsDir, `${presentationId}.json`);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return data;
        });
    }
    loadAllPresentations() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = fs.readdirSync(this.presentationsDir).filter(file => file.endsWith('.json'));
            const presentations = [];
            for (const file of files) {
                const filePath = path.join(this.presentationsDir, file);
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    presentations.push(data);
                }
                catch (error) {
                    console.error(`Erro ao carregar apresentação ${file}:`, error);
                }
            }
            return presentations.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        });
    }
    deletePresentation(presentationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(this.presentationsDir, `${presentationId}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Apresentação deletada: ${filePath}`);
                return true;
            }
            return false;
        });
    }
    // UTILITÁRIOS
    generateCredentialPreview(credential) {
        var _a, _b, _c;
        return {
            type: ((_a = credential.type) === null || _a === void 0 ? void 0 : _a[1]) || ((_b = credential.type) === null || _b === void 0 ? void 0 : _b[0]) || 'Unknown',
            subject: ((_c = credential.credentialSubject) === null || _c === void 0 ? void 0 : _c.id) || 'Unknown',
            issuanceDate: credential.issuanceDate || new Date().toISOString(),
            issuer: credential.issuer || 'Unknown'
        };
    }
    generatePresentationPreview(presentation) {
        var _a, _b, _c;
        return {
            holder: presentation.holder || 'Unknown',
            credentialCount: ((_a = presentation.verifiableCredential) === null || _a === void 0 ? void 0 : _a.length) || 0,
            created: ((_b = presentation.proof) === null || _b === void 0 ? void 0 : _b.created) || presentation.id || new Date().toISOString(),
            challenge: ((_c = presentation.proof) === null || _c === void 0 ? void 0 : _c.challenge) || 'Unknown'
        };
    }
    // ESTATÍSTICAS
    getStorageStats() {
        const credFiles = fs.readdirSync(this.credentialsDir).filter(f => f.endsWith('.json'));
        const presFiles = fs.readdirSync(this.presentationsDir).filter(f => f.endsWith('.json'));
        let totalSize = 0;
        // Calcular tamanho total
        [...credFiles.map(f => path.join(this.credentialsDir, f)),
            ...presFiles.map(f => path.join(this.presentationsDir, f))].forEach(filePath => {
            try {
                totalSize += fs.statSync(filePath).size;
            }
            catch (error) {
                // Ignorar erros de arquivo
            }
        });
        return {
            credentials: credFiles.length,
            presentations: presFiles.length,
            totalSize: this.formatBytes(totalSize)
        };
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    // BACKUP E RESTORE
    createBackup() {
        return __awaiter(this, void 0, void 0, function* () {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(__dirname, '../../backups');
            this.ensureDirectoryExists(backupDir);
            const backupPath = path.join(backupDir, `backup-${timestamp}`);
            this.ensureDirectoryExists(backupPath);
            // Copiar credenciais
            const credBackupDir = path.join(backupPath, 'credentials');
            this.ensureDirectoryExists(credBackupDir);
            this.copyDirectory(this.credentialsDir, credBackupDir);
            // Copiar apresentações
            const presBackupDir = path.join(backupPath, 'presentations');
            this.ensureDirectoryExists(presBackupDir);
            this.copyDirectory(this.presentationsDir, presBackupDir);
            console.log(`Backup criado em: ${backupPath}`);
            return backupPath;
        });
    }
    copyDirectory(src, dest) {
        const files = fs.readdirSync(src);
        files.forEach(file => {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            fs.copyFileSync(srcPath, destPath);
        });
    }
}
exports.FileStorage = FileStorage;
exports.default = FileStorage;
