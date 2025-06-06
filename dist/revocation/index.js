"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevocationRegistry = void 0;
class RevocationRegistry {
    constructor() {
        this.revokedPresentations = new Set();
    }
    revokePresentation(data) {
        console.log(`Revoking presentation: ${data.presentationId}`);
        this.revokedPresentations.add(data.presentationId);
        return {
            success: true,
            presentationId: data.presentationId,
            revokedAt: new Date().toISOString()
        };
    }
    checkRevocation(presentationId) {
        const isRevoked = this.revokedPresentations.has(presentationId);
        return {
            presentationId,
            revoked: isRevoked,
            checkedAt: new Date().toISOString()
        };
    }
    isRevoked(presentationId) {
        return this.revokedPresentations.has(presentationId);
    }
    getRevokedPresentations() {
        return Array.from(this.revokedPresentations);
    }
}
exports.RevocationRegistry = RevocationRegistry;
exports.default = RevocationRegistry;
