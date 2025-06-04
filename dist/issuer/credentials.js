"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Credentials = void 0;
class Credential {
    constructor(id, type, issuer, claims) {
        this.id = id;
        this.type = type;
        this.issuer = issuer;
        this.claims = claims;
    }
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            issuer: this.issuer,
            claims: this.claims
        };
    }
}
class Credentials {
    constructor() {
        // Construtor sem parâmetros obrigatórios
    }
    async createCredential(data) {
        console.log('Creating credential with data:', data);
        const credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://w3id.org/security/data-integrity/v2"
            ],
            type: ["VerifiableCredential", data.type || "CustomCredential"],
            issuer: "did:example:issuer123",
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
                id: data.subject,
                ...data
            },
            proof: {
                type: "DataIntegrityProof",
                cryptosuite: "ecdsa-rdfc-2019",
                created: new Date().toISOString(),
                verificationMethod: "did:example:issuer123#key-1",
                proofPurpose: "assertionMethod"
            }
        };
        return credential;
    }
}
exports.Credentials = Credentials;
exports.default = Credential;
//# sourceMappingURL=credentials.js.map