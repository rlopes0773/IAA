declare class Credential {
    id: string;
    type: string[];
    issuer: string;
    claims: Record<string, any>;
    constructor(id: string, type: string[], issuer: string, claims: Record<string, any>);
    toJSON(): {
        id: string;
        type: string[];
        issuer: string;
        claims: Record<string, any>;
    };
}
export declare class Credentials {
    constructor();
    createCredential(data: any): Promise<{
        "@context": string[];
        type: any[];
        issuer: string;
        issuanceDate: string;
        credentialSubject: any;
        proof: {
            type: string;
            cryptosuite: string;
            created: string;
            verificationMethod: string;
            proofPurpose: string;
        };
    }>;
}
export default Credential;
//# sourceMappingURL=credentials.d.ts.map