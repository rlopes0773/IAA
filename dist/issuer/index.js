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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Issuer = void 0;
const credentials_1 = __importDefault(require("./credentials"));
const crypto = __importStar(require("crypto"));
class Issuer {
    constructor() {
        // Se o construtor original precisar de 4 argumentos, passe valores padrão
        this.credentials = new credentials_1.default("did:example:issuer123", // issuer DID
        ["issuer-key-1"], // signing key (array)
        "2025-12-31T23:59:59Z", // expiration date
        {} // additional options
        );
    }
    issueCredential(subject, type, additionalData = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Issuing credential for ${subject} of type ${type}`);
            // Use o método correto da classe original ou implemente createCredential
            const credential = yield this.createCredentialData(Object.assign({ subject,
                type }, additionalData));
            return credential;
        });
    }
    createCredentialData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentialId = `credential-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const baseCredential = {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://w3id.org/security/data-integrity/v2"
                ],
                id: credentialId,
                type: ["VerifiableCredential", data.type || "CustomCredential"],
                issuer: "did:example:issuer123",
                issuanceDate: new Date().toISOString(),
                expirationDate: this.calculateExpirationDate(data.type),
                credentialSubject: this.buildCredentialSubject(data)
            };
            // 🔥 CALCULAR HASH DOS DADOS ANTES DE ADICIONAR A PROVA
            const dataHash = this.calculateDataHash(baseCredential);
            // Adicionar prova com hash dos dados
            baseCredential.proof = {
                type: "DataIntegrityProof",
                cryptosuite: "ecdsa-rdfc-2019",
                created: new Date().toISOString(),
                verificationMethod: "did:example:issuer123#key-1",
                proofPurpose: "assertionMethod",
                dataHash: dataHash // 🔥 Hash dos dados para verificação de integridade
            };
            return baseCredential;
        });
    }
    calculateDataHash(data) {
        // Normalizar dados (ordenar chaves) para hash consistente
        const normalizedData = this.normalizeObject(data);
        const dataString = JSON.stringify(normalizedData);
        return crypto.createHash('sha256').update(dataString, 'utf8').digest('hex');
    }
    normalizeObject(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.normalizeObject(item));
        }
        const sortedKeys = Object.keys(obj).sort();
        const normalizedObj = {};
        sortedKeys.forEach(key => {
            normalizedObj[key] = this.normalizeObject(obj[key]);
        });
        return normalizedObj;
    }
    buildCredentialSubject(data) {
        const baseSubject = {
            id: data.subject,
            type: data.type
        };
        // Estruturas específicas por tipo de credencial
        switch (data.type) {
            case 'UniversityDegree':
                return Object.assign(Object.assign({}, baseSubject), { degree: data.degree || 'Bachelor', university: data.university || 'Unknown University', graduationDate: data.graduationDate || new Date().toISOString(), gpa: data.gpa || null, major: data.major || 'Computer Science', honors: data.honors || false });
            case 'DriverLicense':
                return Object.assign(Object.assign({}, baseSubject), { licenseNumber: data.licenseNumber || this.generateLicenseNumber(), licenseClass: data.licenseClass || 'B', issuingState: data.issuingState || 'CA', dateOfBirth: data.dateOfBirth || '1990-01-01', restrictions: data.restrictions || [], endorsements: data.endorsements || [] });
            case 'Certificate':
                return Object.assign(Object.assign({}, baseSubject), { certificateName: data.certificateName || 'Professional Certificate', issuer: data.certificateIssuer || 'Certification Body', skillsValidated: data.skillsValidated || [], certificationLevel: data.certificationLevel || 'Professional' });
            default:
                return Object.assign(Object.assign({}, baseSubject), data // Fallback para campos genéricos
                );
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
// Export default também para compatibilidade
exports.default = Issuer;
