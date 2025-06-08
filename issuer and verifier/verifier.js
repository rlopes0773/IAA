import * as DidKey from '@digitalbazaar/did-method-key';
import * as EcdsaMultikey from '@digitalbazaar/ecdsa-multikey';
import { cryptosuite as ecdsaRdfc2019Cryptosuite } from '@digitalbazaar/ecdsa-rdfc-2019-cryptosuite';
import * as vc from '@digitalbazaar/vc';
import { CachedResolver } from '@digitalbazaar/did-io';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { securityLoader } from '@digitalbazaar/security-document-loader';
import { contexts as diContexts } from '@digitalbazaar/data-integrity-context';
import fs from 'fs';
import { webcrypto } from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// Global setup
globalThis.crypto = webcrypto;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Document loader setup
const loader = securityLoader();
loader.addDocuments({ documents: diContexts });

// Load external contexts
const contextUrls = [
    "https://www.w3.org/ns/odrl.jsonld",
    "https://www.w3.org/2018/credentials/examples/v1"
];

for (const url of contextUrls) {
    try {
        const context = await fetch(url).then(res => res.json());
        loader.addStatic(url, context);
    } catch (error) {
        console.warn(`Failed to load context ${url}:`, error.message);
    }
}

// Load university degree context
const universityDegreeContext = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'contexts', 'university-degree-v1.json'), 'utf8')
);
loader.addStatic("./contexts/university-degree-v1.json", universityDegreeContext);
console.log('✅ Loaded university degree context');

// Load personal data context
const personalDataContext = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'contexts', 'personal-data-v1.json'), 'utf8')
);
loader.addStatic("./contexts/personal-data-v1.json", personalDataContext);
console.log('✅ Loaded personal data context');

// DID resolver setup
const resolver = new CachedResolver();
const didKeyDriver = DidKey.driver();

didKeyDriver.use({
    multibaseMultikeyHeader: 'zDna',
    fromMultibase: EcdsaMultikey.from
});

resolver.use(didKeyDriver);
loader.setDidResolver(resolver);
const documentLoader = loader.build();

// Verify presentation
async function verifyPresentation({ verifiablePresentation, challenge, domain, documentLoader }) {
    console.log('Starting verification with:', { challenge, domain });
    console.log('Holder DID:', verifiablePresentation.holder);

    try {
        // Setup verification suite
        const vpVerifyingSuite = new DataIntegrityProof({
            cryptosuite: ecdsaRdfc2019Cryptosuite
        });

        console.log('Verifying presentation...');

        // Verify presentation
        const verifyPresentationResult = await vc.verify({
            presentation: verifiablePresentation,
            challenge,
            domain,
            suite: vpVerifyingSuite,
            documentLoader
        });

        console.log('VERIFY PRESENTATION RESULT:');
        console.log(JSON.stringify(verifyPresentationResult, null, 2));

        if (verifyPresentationResult.error) {
            console.log('VP ERROR DETAILS:', verifyPresentationResult.error);
            if (verifyPresentationResult.error.errors) {
                verifyPresentationResult.error.errors.forEach((err, index) => {
                    console.log(`Error ${index}:`, err.message);
                });
            }
        }

        // Output result for API parsing
        console.log('Verification result:', JSON.stringify(verifyPresentationResult));
        console.log('Presentation verified:', verifyPresentationResult.verified);

        return verifyPresentationResult;

    } catch (error) {
        console.error('Error in verification:', error);
        throw error;
    }
}

// Main execution
async function main() {
    console.log("Loading VP file");
    
    try {
        const vpFile = process.env.VP_FILE || 'vp.json';
        const challenge = process.env.VERIFY_CHALLENGE || 'abc123';
        const domain = process.env.VERIFY_DOMAIN || 'https://example.com/';

        let verifiablePresentation;
        try {
            verifiablePresentation = JSON.parse(fs.readFileSync(vpFile, 'utf8'));
        } catch (error) {
            console.error(`Error loading ${vpFile}:`, error.message);
            console.log('Please provide a verifiable presentation to verify.');
            process.exit(1);
        }

        if (verifiablePresentation) {
            console.log("Verifying Verifiable Presentation");
            await verifyPresentation({
                verifiablePresentation,
                challenge,
                domain,
                documentLoader
            });
        } else {
            console.log("VP not found or invalid");
        }
    } catch (error) {
        console.error("Error loading or processing VP:", error);
        process.exit(1);
    }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
