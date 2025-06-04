"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDidDocument = exports.createDocumentLoader = void 0;
const security_document_loader_1 = require("@digitalbazaar/security-document-loader");
const data_integrity_context_1 = require("@digitalbazaar/data-integrity-context");
const credentials_context_1 = require("@digitalbazaar/credentials-context");
// Create a custom document loader that includes all necessary contexts
function createDocumentLoader() {
    const loader = (0, security_document_loader_1.securityLoader)();
    // Add additional contexts
    loader.addStatic('https://w3id.org/security/data-integrity/v2', data_integrity_context_1.contexts.get('https://w3id.org/security/data-integrity/v2'));
    loader.addStatic('https://www.w3.org/2018/credentials/v1', credentials_context_1.contexts.get('https://www.w3.org/2018/credentials/v1'));
    return loader.build();
}
exports.createDocumentLoader = createDocumentLoader;
// DID Document template for testing
function createDidDocument(did, publicKey) {
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
exports.createDidDocument = createDidDocument;
