"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RevocationRegistry {
    constructor() {
        this.revokedPresentations = new Set();
    }
    revoke(presentationId) {
        this.revokedPresentations.add(presentationId);
    }
    isRevoked(presentationId) {
        return this.revokedPresentations.has(presentationId);
    }
}
exports.default = RevocationRegistry;
