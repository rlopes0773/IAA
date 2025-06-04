import { Issuer } from '../src/issuer';
import { Holder } from '../src/holder';
import { Verifier } from '../src/verifier';
import { RevocationRegistry } from '../src/revocation';

describe('Digital Bazaar VC Integration Tests', () => {
    let issuer: Issuer;
    let holder: Holder;
    let verifier: Verifier;
    let revocationRegistry: RevocationRegistry;

    beforeEach(() => {
        issuer = new Issuer();
        holder = new Holder();
        revocationRegistry = new RevocationRegistry();
        verifier = new Verifier(revocationRegistry);
    });

    test('Complete VC lifecycle with Digital Bazaar', async () => {
        // 1. Issue a credential
        const credential = await issuer.issueCredential(
            'did:example:student123',
            'UniversityDegree',
            {
                degree: 'Bachelor of Science',
                university: 'Test University',
                major: 'Computer Science'
            }
        );

        expect(credential).toBeDefined();
        expect(credential.type).toContain('VerifiableCredential');
        expect(credential.type).toContain('UniversityDegree');
        expect(credential.proof).toBeDefined();
        expect(credential.proof.type).toBe('DataIntegrityProof');

        // 2. Create a presentation
        const presentation = await holder.createPresentation(
            [credential],
            'test-challenge-123',
            'did:example:student123'
        );

        expect(presentation).toBeDefined();
        expect(presentation.type).toContain('VerifiablePresentation');
        expect(presentation.verifiableCredential).toHaveLength(1);
        expect(presentation.proof).toBeDefined();
        expect(presentation.proof.challenge).toBe('test-challenge-123');

        // 3. Verify the presentation
        const verificationResult = await verifier.verify(presentation, {
            expectedChallenge: 'test-challenge-123'
        });

        expect(verificationResult.verified).toBe(true);
        expect(verificationResult.revoked).toBe(false);
        expect(verificationResult.errors).toHaveLength(0);

        // 4. Test revocation
        revocationRegistry.revokePresentation({ presentationId: presentation.id });
        
        const verificationAfterRevocation = await verifier.verify(presentation);
        expect(verificationAfterRevocation.verified).toBe(false);
        expect(verificationAfterRevocation.revoked).toBe(true);
    });

    test('Multiple credentials in one presentation', async () => {
        // Issue multiple credentials
        const universityCredential = await issuer.issueCredential(
            'did:example:student123',
            'UniversityDegree',
            { degree: 'Bachelor', university: 'Test University' }
        );

        const driverLicenseCredential = await issuer.issueCredential(
            'did:example:student123',
            'DriverLicense',
            { licenseClass: 'B', issuingState: 'CA' }
        );

        // Create presentation with multiple credentials
        const presentation = await holder.createPresentation(
            [universityCredential, driverLicenseCredential],
            'multi-cred-challenge',
            'did:example:student123'
        );

        expect(presentation.verifiableCredential).toHaveLength(2);

        // Verify the multi-credential presentation
        const verificationResult = await verifier.verify(presentation, {
            expectedChallenge: 'multi-cred-challenge'
        });

        expect(verificationResult.verified).toBe(true);
        expect(verificationResult.checks.credentials).toBe(true);
    });

    test('Invalid credential verification', async () => {
        const credential = await issuer.issueCredential(
            'did:example:student123',
            'UniversityDegree',
            { degree: 'Bachelor' }
        );

        // Tamper with the credential
        const tamperedCredential = { ...credential };
        tamperedCredential.credentialSubject.degree = 'Doctorate'; // Change data

        const presentation = await holder.createPresentation(
            [tamperedCredential],
            'test-challenge',
            'did:example:student123'
        );

        const verificationResult = await verifier.verify(presentation);

        // Should fail due to tampered data
        expect(verificationResult.verified).toBe(false);
        expect(verificationResult.errors.length).toBeGreaterThan(0);
    });

    test('Expired credential handling', async () => {
        // Create a credential that's already expired
        const credential = await issuer.issueCredential(
            'did:example:student123',
            'Certificate',
            { 
                certificateName: 'Expired Certificate',
                // Manually set an expiration date in the past
                expirationDate: new Date(Date.now() - 86400000).toISOString() // 1 day ago
            }
        );

        // Manually set expiration date (for testing purposes)
        credential.expirationDate = new Date(Date.now() - 86400000).toISOString();

        const presentation = await holder.createPresentation(
            [credential],
            'test-challenge',
            'did:example:student123'
        );

        const verificationResult = await verifier.verify(presentation);

        expect(verificationResult.verified).toBe(false);
        expect(verificationResult.errors.some(error => 
            error.includes('expired')
        )).toBe(true);
    });
});