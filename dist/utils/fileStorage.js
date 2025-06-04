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
    async saveCredential(credentialId, credential) {
        const filePath = path.join(this.credentialsDir, `${credentialId}.json`);
        const data = {
            id: credentialId,
            credential: credential,
            savedAt: new Date().toISOString(),
            preview: this.generateCredentialPreview(credential)
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Credencial salva em: ${filePath}`);
    }
    async loadCredential(credentialId) {
        const filePath = path.join(this.credentialsDir, `${credentialId}.json`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return data;
    }
    async loadAllCredentials() {
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
    }
    async deleteCredential(credentialId) {
        const filePath = path.join(this.credentialsDir, `${credentialId}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Credencial deletada: ${filePath}`);
            return true;
        }
        return false;
    }
    // APRESENTAÇÕES
    async savePresentation(presentationId, presentation) {
        const filePath = path.join(this.presentationsDir, `${presentationId}.json`);
        const data = {
            id: presentationId,
            presentation: presentation,
            savedAt: new Date().toISOString(),
            preview: this.generatePresentationPreview(presentation)
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Apresentação salva em: ${filePath}`);
    }
    async loadPresentation(presentationId) {
        const filePath = path.join(this.presentationsDir, `${presentationId}.json`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return data;
    }
    async loadAllPresentations() {
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
    }
    async deletePresentation(presentationId) {
        const filePath = path.join(this.presentationsDir, `${presentationId}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Apresentação deletada: ${filePath}`);
            return true;
        }
        return false;
    }
    // UTILITÁRIOS
    generateCredentialPreview(credential) {
        return {
            type: credential.type?.[1] || credential.type?.[0] || 'Unknown',
            subject: credential.credentialSubject?.id || 'Unknown',
            issuanceDate: credential.issuanceDate || new Date().toISOString(),
            issuer: credential.issuer || 'Unknown'
        };
    }
    generatePresentationPreview(presentation) {
        return {
            holder: presentation.holder || 'Unknown',
            credentialCount: presentation.verifiableCredential?.length || 0,
            created: presentation.proof?.created || presentation.id || new Date().toISOString(),
            challenge: presentation.proof?.challenge || 'Unknown'
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
    async createBackup() {
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
//# sourceMappingURL=fileStorage.js.map