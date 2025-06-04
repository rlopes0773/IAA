"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Issuer = void 0;
const vc_1 = require("@digitalbazaar/vc");
const data_integrity_1 = require("@digitalbazaar/data-integrity");
const ecdsa_rdfc_2019_cryptosuite_1 = require("@digitalbazaar/ecdsa-rdfc-2019-cryptosuite");
const security_document_loader_1 = require("@digitalbazaar/security-document-loader");
const keyManager_1 = require("../utils/keyManager");
class Issuer {
    constructor() {
        this.keyManager = new keyManager_1.KeyManager();
        this.issuerDid = 'did:example:issuer123';
    }
    async issueCredential(subject, type, additionalData = {}) {
        console.log(`Issuing credential for ${subject} of type ${type}`);
        // Generate or get issuer key pair
        const keyPair = await this.keyManager.generateIssuerKeyPair();
        // Create the credential
        const credential = await this.createCredentialData({
            subject,
            type,
            ...additionalData
        });
        // Sign the credential using Digital Bazaar
        const signedCredential = await this.signCredential(credential, keyPair);
        return signedCredential;
    }
    async createCredentialData(data) {
        const credentialId = `credential-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://w3id.org/security/data-integrity/v2"
            ],
            id: credentialId,
            type: ["VerifiableCredential", data.type || "CustomCredential"],
            issuer: this.issuerDid,
            issuanceDate: new Date().toISOString(),
            expirationDate: this.calculateExpirationDate(data.type),
            credentialSubject: this.buildCredentialSubject(data)
        };
        return credential;
    }
    async signCredential(credential, keyPair) {
        try {
            // Create the suite for signing
            const suite = new data_integrity_1.DataIntegrityProof({
                signer: keyPair.signer(),
                cryptosuite: ecdsa_rdfc_2019_cryptosuite_1.cryptosuite
            });
            // Sign the credential
            const signedCredential = await (0, vc_1.issue)({
                credential,
                suite,
                documentLoader: (0, security_document_loader_1.securityLoader)().build()
            });
            return signedCredential;
        }
        catch (error) {
            console.error('Error signing credential:', error);
            throw new Error(`Failed to sign credential: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    buildCredentialSubject(data) {
        const baseSubject = {
            id: data.subject,
            type: data.type
        };
        // Estruturas específicas por tipo de credencial
        switch (data.type) {
            case 'UniversityDegree':
                return {
                    ...baseSubject,
                    degree: data.degree || 'Bachelor',
                    university: data.university || 'Unknown University',
                    graduationDate: data.graduationDate || new Date().toISOString(),
                    gpa: data.gpa || null,
                    major: data.major || 'Computer Science',
                    honors: data.honors || false
                };
            case 'DriverLicense':
                return {
                    ...baseSubject,
                    licenseNumber: data.licenseNumber || this.generateLicenseNumber(),
                    licenseClass: data.licenseClass || 'B',
                    issuingState: data.issuingState || 'CA',
                    dateOfBirth: data.dateOfBirth || '1990-01-01',
                    restrictions: data.restrictions || [],
                    endorsements: data.endorsements || []
                };
            case 'Certificate':
                return {
                    ...baseSubject,
                    certificateName: data.certificateName || 'Professional Certificate',
                    issuer: data.certificateIssuer || 'Certification Body',
                    skillsValidated: data.skillsValidated || [],
                    certificationLevel: data.certificationLevel || 'Professional'
                };
            default:
                return {
                    ...baseSubject,
                    ...data // Fallback para campos genéricos
                };
        }
    }
    calculateExpirationDate(type) {
        const now = new Date();
        switch (type) {
            case 'UniversityDegree':
                // Diplomas não expiram
                return "";
            case 'DriverLicense':
                // Carteira expira em 5 anos
                now.setFullYear(now.getFullYear() + 5);
                return now.toISOString();
            case 'Certificate':
                // Certificados expiram em 2 anos
                now.setFullYear(now.getFullYear() + 2);
                return now.toISOString();
            default:
                // Default: 1 ano
                now.setFullYear(now.getFullYear() + 1);
                return now.toISOString();
        }
    }
    generateLicenseNumber() {
        return 'DL' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }
}
exports.Issuer = Issuer;
exports.default = Issuer;
//# sourceMappingURL=index.js.map