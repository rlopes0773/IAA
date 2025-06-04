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
exports.Presentation = void 0;
const vc_1 = require("@digitalbazaar/vc");
const data_integrity_1 = require("@digitalbazaar/data-integrity");
const ecdsa_rdfc_2019_cryptosuite_1 = require("@digitalbazaar/ecdsa-rdfc-2019-cryptosuite");
const security_document_loader_1 = require("@digitalbazaar/security-document-loader");
const keyManager_1 = require("../utils/keyManager");
class Presentation {
    constructor() {
        this.keyManager = new keyManager_1.KeyManager();
    }
    createPresentation(credentials, challenge, holderDid) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Creating verifiable presentation with ${credentials.length} credentials...`);
            const holder = holderDid || ((_b = (_a = credentials[0]) === null || _a === void 0 ? void 0 : _a.credentialSubject) === null || _b === void 0 ? void 0 : _b.id) || 'did:example:holder123';
            // Generate or get holder key pair
            const keyPair = yield this.keyManager.generateHolderKeyPair(holder);
            // Create the presentation
            const presentation = yield this.createPresentationData(credentials, holder);
            // Sign the presentation using Digital Bazaar
            const signedPresentation = yield this.signPresentation(presentation, keyPair, challenge);
            return signedPresentation;
        });
    }
    createPresentationData(credentials, holder) {
        return __awaiter(this, void 0, void 0, function* () {
            const presentationId = `presentation-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const presentation = {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://w3id.org/security/data-integrity/v2"
                ],
                type: ["VerifiablePresentation"],
                verifiableCredential: credentials,
                id: presentationId,
                holder: holder
            };
            return presentation;
        });
    }
    signPresentation(presentation, keyPair, challenge) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create the suite for signing
                const suite = new data_integrity_1.DataIntegrityProof({
                    signer: keyPair.signer(),
                    cryptosuite: ecdsa_rdfc_2019_cryptosuite_1.cryptosuite
                });
                // Sign the presentation
                const signedPresentation = yield (0, vc_1.signPresentation)({
                    presentation,
                    suite,
                    challenge: challenge || "default-challenge",
                    documentLoader: (0, security_document_loader_1.securityLoader)().build()
                });
                return signedPresentation;
            }
            catch (error) {
                console.error('Error signing presentation:', error);
                throw new Error(`Failed to sign presentation: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    // Method for selective disclosure (future enhancement)
    createSelectivePresentation(credentials, selectedAttributes, challenge, holderDid) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would implement selective disclosure logic
            // For now, just create a normal presentation
            return this.createPresentation(credentials, challenge, holderDid);
        });
    }
}
exports.Presentation = Presentation;
exports.default = Presentation;
