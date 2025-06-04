import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import { X25519KeyAgreementKey2019 } from '@digitalbazaar/x25519-key-agreement-key-2019';

export class KeyManager {
    private issuerKeyPair: any;
    private holderKeyPair: any;

    constructor() {
        this.issuerKeyPair = null;
        this.holderKeyPair = null;
    }

    // Generate key pair for issuer
    async generateIssuerKeyPair(): Promise<any> {
        if (!this.issuerKeyPair) {
            this.issuerKeyPair = await Ed25519VerificationKey2020.generate({
                id: 'did:example:issuer123#key-1',
                controller: 'did:example:issuer123'
            });
        }
        return this.issuerKeyPair;
    }

    // Generate key pair for holder
    async generateHolderKeyPair(holderId: string): Promise<any> {
        if (!this.holderKeyPair) {
            this.holderKeyPair = await Ed25519VerificationKey2020.generate({
                id: `${holderId}#key-1`,
                controller: holderId
            });
        }
        return this.holderKeyPair;
    }

    // Get issuer public key for verification
    getIssuerPublicKey(): any {
        return this.issuerKeyPair;
    }

    // Get holder public key for verification
    getHolderPublicKey(): any {
        return this.holderKeyPair;
    }

    // Export key pair (for storage/backup)
    async exportIssuerKeyPair(): Promise<any> {
        if (!this.issuerKeyPair) {
            await this.generateIssuerKeyPair();
        }
        return await this.issuerKeyPair.export({ publicKey: true, privateKey: true });
    }

    // Import key pair (from storage/backup)
    async importIssuerKeyPair(keyData: any): Promise<void> {
        this.issuerKeyPair = await Ed25519VerificationKey2020.from(keyData);
    }
}