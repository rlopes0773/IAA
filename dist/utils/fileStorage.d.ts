export declare class FileStorage {
    private credentialsDir;
    private presentationsDir;
    constructor();
    private ensureDirectoryExists;
    saveCredential(credentialId: string, credential: any): Promise<void>;
    loadCredential(credentialId: string): Promise<any | null>;
    loadAllCredentials(): Promise<any[]>;
    deleteCredential(credentialId: string): Promise<boolean>;
    savePresentation(presentationId: string, presentation: any): Promise<void>;
    loadPresentation(presentationId: string): Promise<any | null>;
    loadAllPresentations(): Promise<any[]>;
    deletePresentation(presentationId: string): Promise<boolean>;
    private generateCredentialPreview;
    private generatePresentationPreview;
    getStorageStats(): {
        credentials: number;
        presentations: number;
        totalSize: string;
    };
    private formatBytes;
    createBackup(): Promise<string>;
    private copyDirectory;
}
export default FileStorage;
//# sourceMappingURL=fileStorage.d.ts.map