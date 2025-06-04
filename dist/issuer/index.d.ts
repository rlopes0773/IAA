export declare class Issuer {
    private keyManager;
    private issuerDid;
    constructor();
    issueCredential(subject: string, type: string, additionalData?: any): Promise<any>;
    private createCredentialData;
    private signCredential;
    private buildCredentialSubject;
    private calculateExpirationDate;
    private generateLicenseNumber;
}
export default Issuer;
//# sourceMappingURL=index.d.ts.map