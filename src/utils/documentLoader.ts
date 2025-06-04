import { securityLoader } from '@digitalbazaar/security-document-loader';
import { contexts as dataIntegrityContext } from '@digitalbazaar/data-integrity-context';
import { contexts as credentialsContext } from '@digitalbazaar/credentials-context';

// Create a custom document loader that includes all necessary contexts
export function createDocumentLoader() {
    const loader = securityLoader();
    
    // Add additional contexts
    loader.addStatic(
        'https://w3id.org/security/data-integrity/v2', 
        dataIntegrityContext.get('https://w3id.org/security/data-integrity/v2')
    );
    
    loader.addStatic(
        'https://www.w3.org/2018/credentials/v1', 
        credentialsContext.get('https://www.w3.org/2018/credentials/v1')
    );

    return loader.build();
}

// DID Document template for testing
export function createDidDocument(did: string, publicKey: any) {
    return {
        '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/data-integrity/v2'
        ],
        id: did,
        verificationMethod: [{
            id: `${did}#key-1`,
            type: 'Ed25519VerificationKey2020',
            controller: did,
            publicKeyMultibase: publicKey.publicKeyMultibase
        }],
        authentication: [`${did}#key-1`],
        assertionMethod: [`${did}#key-1`],
        capabilityDelegation: [`${did}#key-1`],
        capabilityInvocation: [`${did}#key-1`]
    };
}