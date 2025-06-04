"use strict";
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
    async createPresentation(credentials, challenge, holderDid) {
        console.log(`Creating verifiable presentation with ${credentials.length} credentials...`);
        const holder = holderDid || credentials[0]?.credentialSubject?.id || 'did:example:holder123';
        // Generate or get holder key pair
        const keyPair = await this.keyManager.generateHolderKeyPair(holder);
        // Create the presentation
        const presentation = await this.createPresentationData(credentials, holder);
        // Sign the presentation using Digital Bazaar
        const signedPresentation = await this.signPresentation(presentation, keyPair, challenge);
        return signedPresentation;
    }
    async createPresentationData(credentials, holder) {
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
    }
    async signPresentation(presentation, keyPair, challenge) {
        try {
            // Create the suite for signing
            const suite = new data_integrity_1.DataIntegrityProof({
                signer: keyPair.signer(),
                cryptosuite: ecdsa_rdfc_2019_cryptosuite_1.cryptosuite
            });
            // Sign the presentation
            const signedPresentation = await (0, vc_1.signPresentation)({
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
    }
    // Method for selective disclosure (future enhancement)
    async createSelectivePresentation(credentials, selectedAttributes, challenge, holderDid) {
        // This would implement selective disclosure logic
        // For now, just create a normal presentation
        return this.createPresentation(credentials, challenge, holderDid);
    }
}
exports.Presentation = Presentation;
exports.default = Presentation;
//# sourceMappingURL=presentation.js.map