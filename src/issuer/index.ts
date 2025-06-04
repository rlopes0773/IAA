import Credentials from './credentials';
import * as crypto from 'crypto';

export class Issuer {
    private credentials: Credentials;

    constructor() {
        // Se o construtor original precisar de 4 argumentos, passe valores padrão
        this.credentials = new Credentials(
            "did:example:issuer123",    // issuer DID
            ["issuer-key-1"],           // signing key (array)
            "2025-12-31T23:59:59Z",     // expiration date
            {}                          // additional options
        );
    }

    async issueCredential(subject: string, type: string, additionalData: any = {}) {
        console.log(`Issuing credential for ${subject} of type ${type}`);
        
        // Use o método correto da classe original ou implemente createCredential
        const credential = await this.createCredentialData({
            subject,
            type,
            ...additionalData
        });

        return credential;
    }

    private async createCredentialData(data: any) {
        const credentialId = `credential-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        interface VerifiableCredential {
            "@context": string[];
            id: string;
            type: string[];
            issuer: string;
            issuanceDate: string;
            expirationDate: string;
            credentialSubject: any;
            proof?: any;
        }
        
        const baseCredential: VerifiableCredential = {
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
            dataHash: dataHash  // 🔥 Hash dos dados para verificação de integridade
        };

        return baseCredential;
    }

    private calculateDataHash(data: any): string {
        // Normalizar dados (ordenar chaves) para hash consistente
        const normalizedData = this.normalizeObject(data);
        const dataString = JSON.stringify(normalizedData);
        return crypto.createHash('sha256').update(dataString, 'utf8').digest('hex');
    }

    private normalizeObject(obj: any): any {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.normalizeObject(item));
        }

        const sortedKeys = Object.keys(obj).sort();
        const normalizedObj: any = {};
        
        sortedKeys.forEach(key => {
            normalizedObj[key] = this.normalizeObject(obj[key]);
        });

        return normalizedObj;
    }

    private buildCredentialSubject(data: any) {
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

    private calculateExpirationDate(type: string): string {
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

    private generateLicenseNumber(): string {
        return 'DL' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }
}

// Export default também para compatibilidade
export default Issuer;