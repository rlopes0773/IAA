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
    createCredential(data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Creating credential with data:', data);
            const credential = {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://w3id.org/security/data-integrity/v2"
                ],
                type: ["VerifiableCredential", data.type || "CustomCredential"],
                issuer: "did:example:issuer123",
                issuanceDate: new Date().toISOString(),
                credentialSubject: Object.assign({ id: data.subject }, data),
                proof: {
                    type: "DataIntegrityProof",
                    cryptosuite: "ecdsa-rdfc-2019",
                    created: new Date().toISOString(),
                    verificationMethod: "did:example:issuer123#key-1",
                    proofPurpose: "assertionMethod"
                }
            };
            return credential;
        });
    }
}
exports.Credentials = Credentials;
exports.default = Credential;
