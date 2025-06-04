class RevocationRegistry {
    private revokedPresentations: Set<string>;

    constructor() {
        this.revokedPresentations = new Set();
    }

    revoke(presentationId: string): void {
        this.revokedPresentations.add(presentationId);
    }

    isRevoked(presentationId: string): boolean {
        return this.revokedPresentations.has(presentationId);
    }
}

export default RevocationRegistry;