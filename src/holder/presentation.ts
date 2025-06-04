import { signPresentation } from '@digitalbazaar/vc';
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { cryptosuite as ecdsaRdfc2019Cryptosuite } from '@digitalbazaar/ecdsa-rdfc-2019-cryptosuite';
import { securityLoader } from '@digitalbazaar/security-document-loader';
import { KeyManager } from '../utils/keyManager';

export class Presentation {
    private keyManager: KeyManager;

    constructor() {
        this.keyManager = new KeyManager();
    }

    async createPresentation(credentials: any[], challenge?: string, holderDid?: string) {
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

    private async createPresentationData(credentials: any[], holder: string) {
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

    private async signPresentation(presentation: any, keyPair: any, challenge?: string) {
        try {
            // Create the suite for signing
            const suite = new DataIntegrityProof({
                signer: keyPair.signer(),
                cryptosuite: ecdsaRdfc2019Cryptosuite
            });

            // Sign the presentation
            const signedPresentation = await signPresentation({
                presentation,
                suite,
                challenge: challenge || "default-challenge",
                documentLoader: securityLoader().build()
            });

            return signedPresentation;
        } catch (error) {
            console.error('Error signing presentation:', error);
            throw new Error(`Failed to sign presentation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Method for selective disclosure (future enhancement)
    async createSelectivePresentation(credentials: any[], selectedAttributes: string[], challenge?: string, holderDid?: string) {
        // This would implement selective disclosure logic
        // For now, just create a normal presentation
        return this.createPresentation(credentials, challenge, holderDid);
    }
}

export default Presentation;