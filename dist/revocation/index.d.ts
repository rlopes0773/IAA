export declare class RevocationRegistry {
    private revokedPresentations;
    constructor();
    revokePresentation(data: {
        presentationId: string;
    }): any;
    checkRevocation(presentationId: string): any;
    isRevoked(presentationId: string): boolean;
    getRevokedPresentations(): string[];
}
export default RevocationRegistry;
//# sourceMappingURL=index.d.ts.map