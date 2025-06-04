export declare class KeyManager {
    private issuerKeyPair;
    private holderKeyPair;
    constructor();
    generateIssuerKeyPair(): Promise<any>;
    generateHolderKeyPair(holderId: string): Promise<any>;
    getIssuerPublicKey(): any;
    getHolderPublicKey(): any;
    exportIssuerKeyPair(): Promise<any>;
    importIssuerKeyPair(keyData: any): Promise<void>;
}
//# sourceMappingURL=keyManager.d.ts.map