import * as fs from 'fs';
import * as path from 'path';

export class FileStorage {
    private credentialsDir: string;
    private presentationsDir: string;

    constructor() {
        this.credentialsDir = path.join(__dirname, '../../data/credentials');
        this.presentationsDir = path.join(__dirname, '../../data/presentations');
        
        // Criar diretórios se não existirem
        this.ensureDirectoryExists(this.credentialsDir);
        this.ensureDirectoryExists(this.presentationsDir);
    }

    private ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    // CREDENCIAIS
    async saveCredential(credentialId: string, credential: any): Promise<void> {
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

    async loadCredential(credentialId: string): Promise<any | null> {
        const filePath = path.join(this.credentialsDir, `${credentialId}.json`);
        
        if (!fs.existsSync(filePath)) {
            return null;
        }
        
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return data;
    }

    async loadAllCredentials(): Promise<any[]> {
        const files = fs.readdirSync(this.credentialsDir).filter(file => file.endsWith('.json'));
        const credentials = [];

        for (const file of files) {
            const filePath = path.join(this.credentialsDir, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                credentials.push(data);
            } catch (error) {
                console.error(`Erro ao carregar credencial ${file}:`, error);
            }
        }

        return credentials.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }

    async deleteCredential(credentialId: string): Promise<boolean> {
        const filePath = path.join(this.credentialsDir, `${credentialId}.json`);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Credencial deletada: ${filePath}`);
            return true;
        }
        
        return false;
    }

    // APRESENTAÇÕES
    async savePresentation(presentationId: string, presentation: any): Promise<void> {
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

    async loadPresentation(presentationId: string): Promise<any | null> {
        const filePath = path.join(this.presentationsDir, `${presentationId}.json`);
        
        if (!fs.existsSync(filePath)) {
            return null;
        }
        
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return data;
    }

    async loadAllPresentations(): Promise<any[]> {
        const files = fs.readdirSync(this.presentationsDir).filter(file => file.endsWith('.json'));
        const presentations = [];

        for (const file of files) {
            const filePath = path.join(this.presentationsDir, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                presentations.push(data);
            } catch (error) {
                console.error(`Erro ao carregar apresentação ${file}:`, error);
            }
        }

        return presentations.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }

    async deletePresentation(presentationId: string): Promise<boolean> {
        const filePath = path.join(this.presentationsDir, `${presentationId}.json`);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Apresentação deletada: ${filePath}`);
            return true;
        }
        
        return false;
    }

    // UTILITÁRIOS
    private generateCredentialPreview(credential: any): any {
        return {
            type: credential.type?.[1] || credential.type?.[0] || 'Unknown',
            subject: credential.credentialSubject?.id || 'Unknown',
            issuanceDate: credential.issuanceDate || new Date().toISOString(),
            issuer: credential.issuer || 'Unknown'
        };
    }

    private generatePresentationPreview(presentation: any): any {
        return {
            holder: presentation.holder || 'Unknown',
            credentialCount: presentation.verifiableCredential?.length || 0,
            created: presentation.proof?.created || presentation.id || new Date().toISOString(),
            challenge: presentation.proof?.challenge || 'Unknown'
        };
    }

    // ESTATÍSTICAS
    getStorageStats(): { credentials: number; presentations: number; totalSize: string } {
        const credFiles = fs.readdirSync(this.credentialsDir).filter(f => f.endsWith('.json'));
        const presFiles = fs.readdirSync(this.presentationsDir).filter(f => f.endsWith('.json'));
        
        let totalSize = 0;
        
        // Calcular tamanho total
        [...credFiles.map(f => path.join(this.credentialsDir, f)), 
         ...presFiles.map(f => path.join(this.presentationsDir, f))].forEach(filePath => {
            try {
                totalSize += fs.statSync(filePath).size;
            } catch (error) {
                // Ignorar erros de arquivo
            }
        });

        return {
            credentials: credFiles.length,
            presentations: presFiles.length,
            totalSize: this.formatBytes(totalSize)
        };
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // BACKUP E RESTORE
    async createBackup(): Promise<string> {
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

    private copyDirectory(src: string, dest: string): void {
        const files = fs.readdirSync(src);
        files.forEach(file => {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            fs.copyFileSync(srcPath, destPath);
        });
    }
}

export default FileStorage;