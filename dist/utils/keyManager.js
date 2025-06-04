"use strict";
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
exports.KeyManager = void 0;
const ed25519_verification_key_2020_1 = require("@digitalbazaar/ed25519-verification-key-2020");
class KeyManager {
    constructor() {
        this.issuerKeyPair = null;
        this.holderKeyPair = null;
    }
    // Generate key pair for issuer
    generateIssuerKeyPair() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.issuerKeyPair) {
                this.issuerKeyPair = yield ed25519_verification_key_2020_1.Ed25519VerificationKey2020.generate({
                    id: 'did:example:issuer123#key-1',
                    controller: 'did:example:issuer123'
                });
            }
            return this.issuerKeyPair;
        });
    }
    // Generate key pair for holder
    generateHolderKeyPair(holderId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.holderKeyPair) {
                this.holderKeyPair = yield ed25519_verification_key_2020_1.Ed25519VerificationKey2020.generate({
                    id: `${holderId}#key-1`,
                    controller: holderId
                });
            }
            return this.holderKeyPair;
        });
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
    exportIssuerKeyPair() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.issuerKeyPair) {
                yield this.generateIssuerKeyPair();
            }
            return yield this.issuerKeyPair.export({ publicKey: true, privateKey: true });
        });
    }
    // Import key pair (from storage/backup)
    importIssuerKeyPair(keyData) {
        return __awaiter(this, void 0, void 0, function* () {
            this.issuerKeyPair = yield ed25519_verification_key_2020_1.Ed25519VerificationKey2020.from(keyData);
        });
    }
}
exports.KeyManager = KeyManager;
