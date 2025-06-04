export interface Credential {
    id: string;
    type: string[];
    issuer: string;
    claims: Record<string, any>;
}
export interface Presentation {
    id: string;
    type: string[];
    holder: string;
    verifiableCredential: Credential[];
}
export interface RevocationStatus {
    id: string;
    revoked: boolean;
    reason?: string;
}
//# sourceMappingURL=index.d.ts.map