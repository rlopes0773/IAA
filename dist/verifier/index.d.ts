import { RevocationRegistry } from '../revocation';
export declare class Verifier {
    private revocationRegistry;
    private keyManager;
    constructor(revocationRegistry: RevocationRegistry);
    verify(presentation: any, options?: any): Promise<any>;
    verifyPresentation(presentation: any, options?: any): Promise<any>;
    private verifyPresentationCryptographically;
    private validateCredentialsCryptographically;
    private validateCredentialStructure;
    private validateStructure;
    private checkRevocationStatus;
    private validateChallenge;
    private validateExpiration;
    verifyPresentationWithContext(presentation: any, context: {
        expectedChallenge?: string;
        expectedHolder?: string;
        maxAge?: number;
        requireNonRevoked?: boolean;
    }): Promise<any>;
}
export default Verifier;
//# sourceMappingURL=index.d.ts.map