export class RevocationRegistry {
    private revokedPresentations: Set<string>;

    constructor() {
        this.revokedPresentations = new Set();
    }

    revokePresentation(data: { presentationId: string }): any {
        console.log(`Revoking presentation: ${data.presentationId}`);
        this.revokedPresentations.add(data.presentationId);
        return {
            success: true,
            presentationId: data.presentationId,
            revokedAt: new Date().toISOString()
        };
    }

    checkRevocation(presentationId: string): any {
        const isRevoked = this.revokedPresentations.has(presentationId);
        return {
            presentationId,
            revoked: isRevoked,
            checkedAt: new Date().toISOString()
        };
    }

    isRevoked(presentationId: string): boolean {
        return this.revokedPresentations.has(presentationId);
    }

    getRevokedPresentations(): string[] {
        return Array.from(this.revokedPresentations);
    }
}

export default RevocationRegistry;