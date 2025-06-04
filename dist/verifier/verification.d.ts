import { RevocationRegistry } from '../revocation';
export declare class Verification {
    private revocationRegistry;
    constructor(revocationRegistry: RevocationRegistry);
    verifyPresentation(presentation: any, options?: any): Promise<any>;
    private validateStructure;
    private checkRevocationStatus;
    private validateChallenge;
    private validateSignature;
    private verifyDataIntegrity;
    private checkPresentationIntegrity;
    private checkCredentialIntegrity;
    private normalizeData;
    private sortObjectKeys;
    private calculateHash;
    private extractExpectedHash;
    private verifyCryptographicSignature;
    private simulateRealSignatureVerification;
    private validateExpiration;
    private validateCredentials;
    verifyPresentationWithContext(presentation: any, context: {
        expectedChallenge?: string;
        expectedHolder?: string;
        maxAge?: number;
        requireNonRevoked?: boolean;
    }): Promise<any>;
}
export default Verification;
//# sourceMappingURL=verification.d.ts.map