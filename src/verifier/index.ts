import { verifyCredential, verifyPresentation } from '@digitalbazaar/vc';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { cryptosuite as ecdsaRdfc2019Cryptosuite } from '@digitalbazaar/ecdsa-rdfc-2019-cryptosuite';
import { securityLoader } from '@digitalbazaar/security-document-loader';
import { RevocationRegistry } from '../revocation';
import { KeyManager } from '../utils/keyManager';

export class Verifier {
    private revocationRegistry: RevocationRegistry;
    private keyManager: KeyManager;

    constructor(revocationRegistry: RevocationRegistry) {
        this.revocationRegistry = revocationRegistry;
        this.keyManager = new KeyManager();
    }

    // Add the missing verify method that app.ts expects
    async verify(presentation: any, options: any = {}): Promise<any> {
        return this.verifyPresentation(presentation, options);
    }

    async verifyPresentation(presentation: any, options: any = {}): Promise<any> {
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
            errors: [] as string[],
            warnings: [] as string[]
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
            const cryptoCheck = await this.verifyPresentationCryptographically(presentation, options);
            verificationResult.checks.signature = cryptoCheck.verified;
            if (!cryptoCheck.verified) {
                verificationResult.errors.push(...(cryptoCheck.errors || []));
            }

            // 4. VERIFICAÇÃO DAS CREDENCIAIS USANDO DIGITAL BAZAAR
            const credentialsCheck = await this.validateCredentialsCryptographically(presentation.verifiableCredential);
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

        } catch (error) {
            verificationResult.errors.push(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
            return verificationResult;
        }
    }

    private async verifyPresentationCryptographically(presentation: any, options: any = {}): Promise<any> {
        try {
            // Create the suite for verification
            const suite = new DataIntegrityProof({
                cryptosuite: ecdsaRdfc2019Cryptosuite
            });

            // Verify the presentation using Digital Bazaar
            const result = await verifyPresentation({
                presentation,
                suite,
                challenge: options.expectedChallenge,
                documentLoader: securityLoader().build()
            });

            return {
                verified: result.verified,
                errors: result.error ? [result.error.message] : []
            };

        } catch (error) {
            return {
                verified: false,
                errors: [`Cryptographic verification failed: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    }

    private async validateCredentialsCryptographically(credentials: any[]): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!Array.isArray(credentials) || credentials.length === 0) {
            errors.push('No valid credentials found in the presentation');
            return { valid: false, errors, warnings };
        }

        // Create the suite for verification
        const suite = new DataIntegrityProof({
            cryptosuite: ecdsaRdfc2019Cryptosuite
        });

        for (let i = 0; i < credentials.length; i++) {
            const credential = credentials[i];
            
            try {
                // Verify each credential using Digital Bazaar
                const result = await verifyCredential({
                    credential,
                    suite,
                    documentLoader: securityLoader().build()
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

            } catch (error) {
                errors.push(`Credential ${i} verification failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    private validateCredentialStructure(credential: any, index: number): { valid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Verificar estrutura básica
        if (!credential.type || !Array.isArray(credential.type)) {
            errors.push(`Credential ${index} has invalid type field`);
        } else if (!credential.type.includes('VerifiableCredential')) {
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
            } else {
                // Aviso se está próximo da expiração (30 dias)
                const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                if (expiryDate < thirtyDaysFromNow) {
                    warnings.push(`Credential ${index} will expire soon (on ${credential.expirationDate})`);
                }
            }
        } else {
            warnings.push(`Credential ${index} has no expiration date`);
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    private validateStructure(presentation: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Verificar campos obrigatórios
        if (!presentation) {
            errors.push('Presentation is null or undefined');
            return { valid: false, errors };
        }

        if (!presentation['@context']) {
            errors.push('Missing @context field');
        } else if (!Array.isArray(presentation['@context'])) {
            errors.push('@context must be an array');
        } else if (!presentation['@context'].includes('https://www.w3.org/2018/credentials/v1')) {
            errors.push('Missing required W3C credentials context');
        }

        if (!presentation.type) {
            errors.push('Missing type field');
        } else if (!Array.isArray(presentation.type)) {
            errors.push('Type must be an array');
        } else if (!presentation.type.includes('VerifiablePresentation')) {
            errors.push('Type must include VerifiablePresentation');
        }

        if (!presentation.verifiableCredential) {
            errors.push('Missing verifiableCredential field');
        } else if (!Array.isArray(presentation.verifiableCredential)) {
            errors.push('verifiableCredential must be an array');
        } else if (presentation.verifiableCredential.length === 0) {
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

    private checkRevocationStatus(presentationId: string): { revoked: boolean } {
        return {
            revoked: this.revocationRegistry.isRevoked(presentationId)
        };
    }

    private validateChallenge(presentation: any, expectedChallenge?: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!presentation.proof?.challenge) {
            errors.push('Missing challenge in proof');
            return { valid: false, errors };
        }

        if (expectedChallenge && presentation.proof.challenge !== expectedChallenge) {
            errors.push(`Challenge mismatch. Expected: ${expectedChallenge}, Got: ${presentation.proof.challenge}`);
        }

        return { valid: errors.length === 0, errors };
    }

    private validateExpiration(presentation: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
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
    async verifyPresentationWithContext(presentation: any, context: {
        expectedChallenge?: string;
        expectedHolder?: string;
        maxAge?: number;
        requireNonRevoked?: boolean;
    }): Promise<any> {
        const result = await this.verifyPresentation(presentation, context);
        
        // Additional context-based checks
        if (context.expectedHolder && presentation.holder !== context.expectedHolder) {
            result.errors.push(`Holder mismatch. Expected: ${context.expectedHolder}, Got: ${presentation.holder}`);
            result.verified = false;
        }
        
        return result;
    }
}

export default Verifier;