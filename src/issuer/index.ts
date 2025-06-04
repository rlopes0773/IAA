import { issue } from '@digitalbazaar/vc';
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { cryptosuite as ecdsaRdfc2019Cryptosuite } from '@digitalbazaar/ecdsa-rdfc-2019-cryptosuite';
import { securityLoader } from '@digitalbazaar/security-document-loader';
import { KeyManager } from '../utils/keyManager';

export class Issuer {
    private keyManager: KeyManager;
    private issuerDid: string;

    constructor() {
        this.keyManager = new KeyManager();
        this.issuerDid = 'did:example:issuer123';
    }

    async issueCredential(subject: string, type: string, additionalData: any = {}) {
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

    private async createCredentialData(data: any) {
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

    private async signCredential(credential: any, keyPair: any) {
        try {
            // Create the suite for signing
            const suite = new DataIntegrityProof({
                signer: keyPair.signer(),
                cryptosuite: ecdsaRdfc2019Cryptosuite
            });

            // Sign the credential
            const signedCredential = await issue({
                credential,
                suite,
                documentLoader: securityLoader().build()
            });

            return signedCredential;
        } catch (error) {
            console.error('Error signing credential:', error);
            throw new Error(`Failed to sign credential: ${error instanceof Error ? error.message : String(error)}`);
        }
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

export default Issuer;