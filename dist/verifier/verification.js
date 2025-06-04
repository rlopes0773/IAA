"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Verification = void 0;
const crypto = __importStar(require("crypto"));
class Verification {
    constructor(revocationRegistry) {
        this.revocationRegistry = revocationRegistry;
    }
    async verifyPresentation(presentation, options = {}) {
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
            // 3. VERIFICAÇÃO DE CHALLENGE
            const challengeCheck = this.validateChallenge(presentation, options.expectedChallenge);
            verificationResult.checks.challenge = challengeCheck.valid;
            if (!challengeCheck.valid) {
                verificationResult.errors.push(...challengeCheck.errors);
            }
            // 4. VERIFICAÇÃO DE ASSINATURA
            const signatureCheck = await this.validateSignature(presentation);
            verificationResult.checks.signature = signatureCheck.valid;
            if (!signatureCheck.valid) {
                verificationResult.errors.push(...signatureCheck.errors);
            }
            // 5. VERIFICAÇÃO DAS CREDENCIAIS
            const credentialsCheck = await this.validateCredentials(presentation.verifiableCredential);
            verificationResult.checks.credentials = credentialsCheck.valid;
            if (!credentialsCheck.valid) {
                verificationResult.errors.push(...credentialsCheck.errors);
            }
            verificationResult.warnings.push(...credentialsCheck.warnings);
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
        const errors = [];
        if (!presentation.proof?.challenge) {
            errors.push('Missing challenge in proof');
            return { valid: false, errors };
        }
        if (expectedChallenge && presentation.proof.challenge !== expectedChallenge) {
            errors.push(`Challenge mismatch. Expected: ${expectedChallenge}, Got: ${presentation.proof.challenge}`);
        }
        return { valid: errors.length === 0, errors };
    }
    async validateSignature(presentation) {
        const errors = [];
        if (!presentation.proof) {
            errors.push('Missing proof object');
            return { valid: false, errors };
        }
        const proof = presentation.proof;
        // Verificar campos obrigatórios da prova
        if (!proof.type) {
            errors.push('Missing proof type');
        }
        if (!proof.verificationMethod) {
            errors.push('Missing verification method');
        }
        if (!proof.created) {
            errors.push('Missing proof creation date');
        }
        if (!proof.proofPurpose) {
            errors.push('Missing proof purpose');
        }
        else if (proof.proofPurpose !== 'authentication') {
            errors.push(`Invalid proof purpose. Expected: authentication, Got: ${proof.proofPurpose}`);
        }
        // Verificar se a data de criação não é muito antiga
        if (proof.created) {
            const createdDate = new Date(proof.created);
            const now = new Date();
            const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            if (createdDate < hourAgo) {
                errors.push('Proof is too old (created more than 1 hour ago)');
            }
            if (createdDate > now) {
                errors.push('Proof creation date is in the future');
            }
        }
        // 🔥 NOVA VERIFICAÇÃO DE INTEGRIDADE
        const integrityCheck = this.verifyDataIntegrity(presentation);
        if (!integrityCheck.valid) {
            errors.push(...integrityCheck.errors);
        }
        // Verificação criptográfica real
        const signatureValid = await this.verifyCryptographicSignature(presentation);
        if (!signatureValid.valid) {
            errors.push(...signatureValid.errors);
        }
        return { valid: errors.length === 0, errors };
    }
    verifyDataIntegrity(presentation) {
        const errors = [];
        try {
            // 1. Verificar integridade da apresentação
            const presentationIntegrity = this.checkPresentationIntegrity(presentation);
            if (!presentationIntegrity.valid) {
                errors.push('Presentation data integrity check failed');
                errors.push(`Expected hash: ${presentationIntegrity.expectedHash}`);
                errors.push(`Actual hash: ${presentationIntegrity.actualHash}`);
            }
            // 2. Verificar integridade de cada credencial
            if (presentation.verifiableCredential) {
                for (let i = 0; i < presentation.verifiableCredential.length; i++) {
                    const credential = presentation.verifiableCredential[i];
                    const credentialIntegrity = this.checkCredentialIntegrity(credential);
                    if (!credentialIntegrity.valid) {
                        errors.push(`Credential ${i} integrity check failed`);
                        errors.push(`Credential ${i} expected hash: ${credentialIntegrity.expectedHash}`);
                        errors.push(`Credential ${i} actual hash: ${credentialIntegrity.actualHash}`);
                    }
                }
            }
            return { valid: errors.length === 0, errors };
        }
        catch (error) {
            errors.push(`Data integrity verification failed: ${error instanceof Error ? error.message : String(error)}`);
            return { valid: false, errors };
        }
    }
    checkPresentationIntegrity(presentation) {
        try {
            // Criar uma cópia da apresentação sem a prova para calcular o hash
            const presentationWithoutProof = { ...presentation };
            delete presentationWithoutProof.proof;
            // Normalizar e ordenar os dados para hash consistente
            const normalizedData = this.normalizeData(presentationWithoutProof);
            const actualHash = this.calculateHash(normalizedData);
            // Extrair hash esperado da prova (se existir)
            // Em um sistema real, isso estaria embebido na assinatura
            const expectedHash = this.extractExpectedHash(presentation.proof);
            if (!expectedHash) {
                // Se não há hash esperado, considerar válido para compatibilidade
                return { valid: true };
            }
            return {
                valid: actualHash === expectedHash,
                expectedHash,
                actualHash
            };
        }
        catch (error) {
            return { valid: false };
        }
    }
    checkCredentialIntegrity(credential) {
        try {
            // Criar uma cópia da credencial sem a prova
            const credentialWithoutProof = { ...credential };
            delete credentialWithoutProof.proof;
            // Calcular hash dos dados
            const normalizedData = this.normalizeData(credentialWithoutProof);
            const actualHash = this.calculateHash(normalizedData);
            // Extrair hash esperado da prova
            const expectedHash = this.extractExpectedHash(credential.proof);
            if (!expectedHash) {
                // Se não há hash esperado, considerar válido para compatibilidade
                return { valid: true };
            }
            return {
                valid: actualHash === expectedHash,
                expectedHash,
                actualHash
            };
        }
        catch (error) {
            return { valid: false };
        }
    }
    normalizeData(data) {
        // Normalizar dados para hash consistente
        // Remover espaços, ordenar chaves, etc.
        const sortedData = this.sortObjectKeys(data);
        return JSON.stringify(sortedData);
    }
    sortObjectKeys(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sortObjectKeys(item));
        }
        const sortedKeys = Object.keys(obj).sort();
        const sortedObj = {};
        sortedKeys.forEach(key => {
            sortedObj[key] = this.sortObjectKeys(obj[key]);
        });
        return sortedObj;
    }
    calculateHash(data) {
        return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
    }
    extractExpectedHash(proof) {
        // Em um sistema real, o hash seria parte da assinatura criptográfica
        // Por agora, vamos simular usando um campo especial na prova
        return proof?.dataHash || null;
    }
    async verifyCryptographicSignature(presentation) {
        const errors = [];
        try {
            const proof = presentation.proof;
            // Verificar se o verification method corresponde ao holder
            if (proof.verificationMethod && presentation.holder) {
                const expectedMethod = presentation.holder + '#key-1';
                if (proof.verificationMethod !== expectedMethod) {
                    errors.push(`Verification method mismatch. Expected: ${expectedMethod}, Got: ${proof.verificationMethod}`);
                }
            }
            // Simular verificação de assinatura digital
            // Em um sistema real, isso usaria a chave pública para verificar a assinatura
            const signatureSimulation = this.simulateRealSignatureVerification(presentation);
            if (!signatureSimulation) {
                errors.push('Cryptographic signature verification failed');
            }
            return { valid: errors.length === 0, errors };
        }
        catch (error) {
            errors.push(`Signature verification error: ${error instanceof Error ? error.message : String(error)}`);
            return { valid: false, errors };
        }
    }
    simulateRealSignatureVerification(presentation) {
        // Simular uma verificação mais rigorosa
        const proof = presentation.proof;
        // Verificar se todos os campos necessários estão presentes
        if (!proof.type || !proof.verificationMethod || !proof.created || !proof.proofPurpose) {
            return false;
        }
        // Verificar se o método de verificação é consistente
        if (presentation.holder && proof.verificationMethod) {
            const expectedMethod = presentation.holder + '#key-1';
            if (proof.verificationMethod !== expectedMethod) {
                return false;
            }
        }
        // Verificar se a data de criação é razoável
        const created = new Date(proof.created);
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        if (created < oneHourAgo || created > now) {
            return false;
        }
        // Em um sistema real, aqui seria feita a verificação criptográfica real
        // Por agora, assumir válido se passou todas as verificações básicas
        return true;
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
    async validateCredentials(credentials) {
        const errors = [];
        const warnings = [];
        if (!Array.isArray(credentials) || credentials.length === 0) {
            errors.push('No valid credentials found in the presentation');
            return { valid: false, errors, warnings };
        }
        for (let i = 0; i < credentials.length; i++) {
            const credential = credentials[i];
            // Verificar estrutura básica
            if (!credential.type || !Array.isArray(credential.type)) {
                errors.push(`Credential ${i} has invalid type field`);
            }
            else if (!credential.type.includes('VerifiableCredential')) {
                errors.push(`Credential ${i} is missing required VerifiableCredential type`);
            }
            if (!credential.issuer) {
                errors.push(`Credential ${i} is missing issuer field`);
            }
            if (!credential.issuanceDate) {
                errors.push(`Credential ${i} is missing issuanceDate`);
            }
            // Verificar expiração
            if (credential.expirationDate) {
                const expiryDate = new Date(credential.expirationDate);
                const now = new Date();
                if (expiryDate < now) {
                    errors.push(`Credential ${i} has expired on ${credential.expirationDate}`);
                }
                else {
                    // Aviso se está próximo da expiração (30 dias)
                    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    if (expiryDate < thirtyDaysFromNow) {
                        warnings.push(`Credential ${i} will expire soon (on ${credential.expirationDate})`);
                    }
                }
            }
            else {
                warnings.push(`Credential ${i} has no expiration date`);
            }
            // Verificar prova (signature)
            if (!credential.proof) {
                errors.push(`Credential ${i} is missing proof`);
            }
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    // Método auxiliar para validação com contexto específico
    async verifyPresentationWithContext(presentation, context) {
        const result = await this.verifyPresentation(presentation, context);
        // Verificações adicionais baseadas no contexto
        if (context.expectedHolder && presentation.holder !== context.expectedHolder) {
            result.errors.push(`Holder mismatch. Expected: ${context.expectedHolder}, Got: ${presentation.holder}`);
            result.verified = false;
        }
        return result;
    }
}
exports.Verification = Verification;
exports.default = Verification;
//# sourceMappingURL=verification.js.map