"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyManager = void 0;
const ed25519_verification_key_2020_1 = require("@digitalbazaar/ed25519-verification-key-2020");
class KeyManager {
    constructor() {
        this.issuerKeyPair = null;
        this.holderKeyPair = null;
    }
    // Generate key pair for issuer
    async generateIssuerKeyPair() {
        if (!this.issuerKeyPair) {
            this.issuerKeyPair = await ed25519_verification_key_2020_1.Ed25519VerificationKey2020.generate({
                id: 'did:example:issuer123#key-1',
                controller: 'did:example:issuer123'
            });
        }
        return this.issuerKeyPair;
    }
    // Generate key pair for holder
    async generateHolderKeyPair(holderId) {
        if (!this.holderKeyPair) {
            this.holderKeyPair = await ed25519_verification_key_2020_1.Ed25519VerificationKey2020.generate({
                id: `${holderId}#key-1`,
                controller: holderId
            });
        }
        return this.holderKeyPair;
    }
    // Get issuer public key for verification
    getIssuerPublicKey() {
        return this.issuerKeyPair;
    }
    // Get holder public key for verification
    getHolderPublicKey() {
        return this.holderKeyPair;
    }
    // Export key pair (for storage/backup)
    async exportIssuerKeyPair() {
        if (!this.issuerKeyPair) {
            await this.generateIssuerKeyPair();
        }
        return await this.issuerKeyPair.export({ publicKey: true, privateKey: true });
    }
    // Import key pair (from storage/backup)
    async importIssuerKeyPair(keyData) {
        this.issuerKeyPair = await ed25519_verification_key_2020_1.Ed25519VerificationKey2020.from(keyData);
    }
}
exports.KeyManager = KeyManager;
//# sourceMappingURL=keyManager.js.map