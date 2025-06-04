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
exports.Verifier = void 0;
const vc_1 = require("@digitalbazaar/vc");
const data_integrity_1 = require("@digitalbazaar/data-integrity");
const ecdsa_rdfc_2019_cryptosuite_1 = require("@digitalbazaar/ecdsa-rdfc-2019-cryptosuite");
const security_document_loader_1 = require("@digitalbazaar/security-document-loader");
const keyManager_1 = require("../utils/keyManager");
class Verifier {
    constructor(revocationRegistry) {
        this.revocationRegistry = revocationRegistry;
        this.keyManager = new keyManager_1.KeyManager();
    }
    verifyPresentation(presentation, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Starting comprehensive presentation verification...');
            const verificationResult = {
                verified: false,
                presentationId: presentation.id,
                revoked: false,
                checks: {
                    structure: false,
                    signature: false,
                    challenge: false,
                    credentials: false,
                    expiration: false,
                    revocation: false
                },
                errors: [],
                warnings: []
            };
            try {
                // 1. VERIFICAÇÃO ESTRUTURAL
                const structureCheck = this.validateStructure(presentation);
                verificationResult.checks.structure = structureCheck.valid;
                if (!structureCheck.valid) {
                    verificationResult.errors.push(...structureCheck.errors);
                }
                // 2. VERIFICAÇÃO DE REVOGAÇÃO
                const revocationCheck = this.checkRevocationStatus(presentation.id);
                verificationResult.checks.revocation = !revocationCheck.revoked;
                verificationResult.revoked = revocationCheck.revoked;
                if (revocationCheck.revoked) {
                    verificationResult.errors.push('Presentation has been revoked');
                    return verificationResult; // Para aqui se foi revogada
                }
                // 3. VERIFICAÇÃO CRIPTOGRÁFICA USANDO DIGITAL BAZAAR
                const cryptoCheck = yield this.verifyPresentationCryptographically(presentation, options);
                verificationResult.checks.signature = cryptoCheck.verified;
                if (!cryptoCheck.verified) {
                    verificationResult.errors.push(...(cryptoCheck.errors || []));
                }
                // 4. VERIFICAÇÃO DAS CREDENCIAIS USANDO DIGITAL BAZAAR
                const credentialsCheck = yield this.validateCredentialsCryptographically(presentation.verifiableCredential);
                verificationResult.checks.credentials = credentialsCheck.valid;
                if (!credentialsCheck.valid) {
                    verificationResult.errors.push(...credentialsCheck.errors);
                }
                verificationResult.warnings.push(...credentialsCheck.warnings);
                // 5. VERIFICAÇÃO DE CHALLENGE
                const challengeCheck = this.validateChallenge(presentation, options.expectedChallenge);
                verificationResult.checks.challenge = challengeCheck.valid;
                if (!challengeCheck.valid) {
                    verificationResult.errors.push(...challengeCheck.errors);
                }
                // 6. VERIFICAÇÃO DE EXPIRAÇÃO
                const expirationCheck = this.validateExpiration(presentation);
                verificationResult.checks.expiration = expirationCheck.valid;
                if (!expirationCheck.valid) {
                    verificationResult.errors.push(...expirationCheck.errors);
                }
                // RESULTADO FINAL
                verificationResult.verified = Object.values(verificationResult.checks).every(check => check === true);
                console.log('Verification completed:', verificationResult);
                return verificationResult;
            }
            catch (error) {
                verificationResult.errors.push(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
                return verificationResult;
            }
        });
    }
    verifyPresentationCryptographically(presentation, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create the suite for verification
                const suite = new data_integrity_1.DataIntegrityProof({
                    cryptosuite: ecdsa_rdfc_2019_cryptosuite_1.cryptosuite
                });
                // Verify the presentation using Digital Bazaar
                const result = yield (0, vc_1.verifyPresentation)({
                    presentation,
                    suite,
                    challenge: options.expectedChallenge,
                    documentLoader: (0, security_document_loader_1.securityLoader)().build()
                });
                return {
                    verified: result.verified,
                    errors: result.error ? [result.error.message] : []
                };
            }
            catch (error) {
                return {
                    verified: false,
                    errors: [`Cryptographic verification failed: ${error instanceof Error ? error.message : String(error)}`]
                };
            }
        });
    }
    validateCredentialsCryptographically(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            const errors = [];
            const warnings = [];
            if (!Array.isArray(credentials) || credentials.length === 0) {
                errors.push('No valid credentials found in the presentation');
                return { valid: false, errors, warnings };
            }
            // Create the suite for verification
            const suite = new data_integrity_1.DataIntegrityProof({
                cryptosuite: ecdsa_rdfc_2019_cryptosuite_1.cryptosuite
            });
            for (let i = 0; i < credentials.length; i++) {
                const credential = credentials[i];
                try {
                    // Verify each credential using Digital Bazaar
                    const result = yield (0, vc_1.verifyCredential)({
                        credential,
                        suite,
                        documentLoader: (0, security_document_loader_1.securityLoader)().build()
                    });
                    if (!result.verified) {
                        errors.push(`Credential ${i} cryptographic verification failed`);
                        if (result.error) {
                            errors.push(`Credential ${i} error: ${result.error.message}`);
                        }
                    }
                    // Additional checks for credential structure and expiration
                    const structureCheck = this.validateCredentialStructure(credential, i);
                    if (!structureCheck.valid) {
                        errors.push(...structureCheck.errors);
                    }
                    warnings.push(...structureCheck.warnings);
                }
                catch (error) {
                    errors.push(`Credential ${i} verification failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            return { valid: errors.length === 0, errors, warnings };
        });
    }
    validateCredentialStructure(credential, index) {
        const errors = [];
        const warnings = [];
        // Verificar estrutura básica
        if (!credential.type || !Array.isArray(credential.type)) {
            errors.push(`Credential ${index} has invalid type field`);
        }
        else if (!credential.type.includes('VerifiableCredential')) {
            errors.push(`Credential ${index} is missing required VerifiableCredential type`);
        }
        if (!credential.issuer) {
            errors.push(`Credential ${index} is missing issuer field`);
        }
        if (!credential.issuanceDate) {
            errors.push(`Credential ${index} is missing issuanceDate`);
        }
        // Verificar expiração
        if (credential.expirationDate) {
            const expiryDate = new Date(credential.expirationDate);
            const now = new Date();
            if (expiryDate < now) {
                errors.push(`Credential ${index} has expired on ${credential.expirationDate}`);
            }
            else {
                // Aviso se está próximo da expiração (30 dias)
                const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                if (expiryDate < thirtyDaysFromNow) {
                    warnings.push(`Credential ${index} will expire soon (on ${credential.expirationDate})`);
                }
            }
        }
        else {
            warnings.push(`Credential ${index} has no expiration date`);
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    validateStructure(presentation) {
        const errors = [];
        // Verificar campos obrigatórios
        if (!presentation) {
            errors.push('Presentation is null or undefined');
            return { valid: false, errors };
        }
        if (!presentation['@context']) {
            errors.push('Missing @context field');
        }
        else if (!Array.isArray(presentation['@context'])) {
            errors.push('@context must be an array');
        }
        else if (!presentation['@context'].includes('https://www.w3.org/2018/credentials/v1')) {
            errors.push('Missing required W3C credentials context');
        }
        if (!presentation.type) {
            errors.push('Missing type field');
        }
        else if (!Array.isArray(presentation.type)) {
            errors.push('Type must be an array');
        }
        else if (!presentation.type.includes('VerifiablePresentation')) {
            errors.push('Type must include VerifiablePresentation');
        }
        if (!presentation.verifiableCredential) {
            errors.push('Missing verifiableCredential field');
        }
        else if (!Array.isArray(presentation.verifiableCredential)) {
            errors.push('verifiableCredential must be an array');
        }
        else if (presentation.verifiableCredential.length === 0) {
            errors.push('verifiableCredential array cannot be empty');
        }
        if (!presentation.proof) {
            errors.push('Missing proof field');
        }
        if (!presentation.holder) {
            errors.push('Missing holder field');
        }
        return { valid: errors.length === 0, errors };
    }
    checkRevocationStatus(presentationId) {
        return {
            revoked: this.revocationRegistry.isRevoked(presentationId)
        };
    }
    validateChallenge(presentation, expectedChallenge) {
        var _a;
        const errors = [];
        if (!((_a = presentation.proof) === null || _a === void 0 ? void 0 : _a.challenge)) {
            errors.push('Missing challenge in proof');
            return { valid: false, errors };
        }
        if (expectedChallenge && presentation.proof.challenge !== expectedChallenge) {
            errors.push(`Challenge mismatch. Expected: ${expectedChallenge}, Got: ${presentation.proof.challenge}`);
        }
        return { valid: errors.length === 0, errors };
    }
    validateExpiration(presentation) {
        const errors = [];
        // Check if presentation has an expirationDate
        if (presentation.expirationDate) {
            const expiryDate = new Date(presentation.expirationDate);
            const now = new Date();
            if (expiryDate < now) {
                errors.push(`Presentation has expired on ${presentation.expirationDate}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    // Method for verifying with additional context
    verifyPresentationWithContext(presentation, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.verifyPresentation(presentation, context);
            // Additional context-based checks
            if (context.expectedHolder && presentation.holder !== context.expectedHolder) {
                result.errors.push(`Holder mismatch. Expected: ${context.expectedHolder}, Got: ${presentation.holder}`);
                result.verified = false;
            }
            return result;
        });
    }
}
exports.Verifier = Verifier;
exports.default = Verifier;
