export declare function createDocumentLoader(): any;
export declare function createDidDocument(did: string, publicKey: any): {
    '@context': string[];
    id: string;
    verificationMethod: {
        id: string;
        type: string;
        controller: string;
        publicKeyMultibase: any;
    }[];
    authentication: string[];
    assertionMethod: string[];
    capabilityDelegation: string[];
    capabilityInvocation: string[];
};
//# sourceMappingURL=documentLoader.d.ts.map