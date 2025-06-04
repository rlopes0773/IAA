declare class RevocationRegistry {
    private revokedPresentations;
    constructor();
    revoke(presentationId: string): void;
    isRevoked(presentationId: string): boolean;
}
export default RevocationRegistry;
//# sourceMappingURL=registry.d.ts.map