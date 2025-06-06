import { Verification } from './verification';
import { RevocationRegistry } from '../revocation';

export class Verifier {
    private verification: Verification;

    constructor(revocationRegistry: RevocationRegistry) {
        this.verification = new Verification(revocationRegistry);
    }

    async verify(presentation: any, credentials?: any) {
        console.log('Verifier starting verification...');
        return await this.verification.verifyPresentation(presentation, credentials);
    }
}

export default Verifier;