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

// Main signing function (CORRIGIDA)
async function signCredential({ credential, documentLoader }) {
    // Generate key pair for VC signer
    const vcEcdsaKeyPair = await EcdsaMultikey.generate({
        curve: 'P-256',
        id: 'did:key:test',
        controller: 'did:key:test'
    });

    const { didDocument } = await didKeyDriver.fromKeyPair({
        verificationKeyPair: vcEcdsaKeyPair
    });

    vcEcdsaKeyPair.id = didDocument.assertionMethod[0];
    vcEcdsaKeyPair.controller = didDocument.id;

    // Ensure issuer matches key controller
    credential.issuer = vcEcdsaKeyPair.controller;

    // Setup signing suite
    const vcSigningSuite = new DataIntegrityProof({
        signer: vcEcdsaKeyPair.signer(),
        cryptosuite: ecdsaRdfc2019Cryptosuite
    });

    console.log('Signing credential...');

    // Sign credential with event handler para ignorar warnings
    const verifiableCredential = await vc.issue({
        credential,
        suite: vcSigningSuite,
        documentLoader,
        eventHandler: (event) => {
            if (event.level === 'warning') {
                console.warn('JSON-LD Warning (ignored):', event.message);
                return; // Ignore warnings
            }
            if (event.level === 'error') {
                console.error('JSON-LD Error:', event.message);
                throw new Error(`JSON-LD Error: ${event.message}`);
            }
        }
    });

    console.log('SIGNED CREDENTIAL:');
    console.log(JSON.stringify(verifiableCredential, null, 2));

    return verifiableCredential;
}

// Create university degree credential (NOVA FUNÇÃO)
export async function createUniversityDegreeCredential(inputFile = 'credential.json') {
    try {
        console.log(`Loading ${inputFile}`);
        const credentialData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

        // Add timestamps
        const now = new Date();
        const expirationDate = new Date(now);
        expirationDate.setFullYear(now.getFullYear() + 10); // Certificados duram 10 anos

        // Build credential
        const credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "./contexts/university-degree-v1.json"
            ],
            "id": `urn:credential:degree:${Date.now()}`,
            "type": ["VerifiableCredential", "UniversityDegreeCredential"],
            "issuanceDate": now.toISOString(),
            "expirationDate": expirationDate.toISOString(),
            "credentialSubject": credentialData.credentialSubject
        };

        const signedCredential = await signCredential({ credential, documentLoader });

        // Output for server parsing
        console.log(`SIGNED_VC:${JSON.stringify(signedCredential)}`);
        console.log('✅ Credencial de certificado universitário criada e assinada');

        return signedCredential;
    } catch (error) {
        console.error('❌ Erro ao criar credencial de certificado:', error);
        throw error;
    }
}

// Create personal data credential (MANTER EXISTENTE)
export async function createPersonalDataCredential(inputFile = 'credential.json') {
    try {
        console.log(`Loading ${inputFile}`);
        const credentialData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

        // Add timestamps
        const now = new Date();
        const expirationDate = new Date(now);
        expirationDate.setFullYear(now.getFullYear() + 1);

        // Build credential
        const credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "./contexts/personal-data-v1.json"
            ],
            "id": `urn:credential:personal:${Date.now()}`,
            "type": ["VerifiableCredential", "PersonalDataCredential"],
            "issuanceDate": now.toISOString(),
            "expirationDate": expirationDate.toISOString(),
            "credentialSubject": credentialData.credentialSubject
        };

        const signedCredential = await signCredential({ credential, documentLoader });

        // Output for server parsing
        console.log(`SIGNED_VC:${JSON.stringify(signedCredential)}`);
        console.log('✅ Credencial de dados pessoais criada e assinada');

        return signedCredential;
    } catch (error) {
        console.error('❌ Erro ao criar credencial:', error);
        throw error;
    }
}

// Execute if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const inputFile = process.argv[2] || 'credential.json';
    const credentialType = process.argv[3] || 'personal-data';

    if (credentialType === 'personal-data') {
        createPersonalDataCredential(inputFile)
            .then(() => console.log('🎉 Processo concluído!'))
            .catch(error => console.error('💥 Falha:', error));
    } else if (credentialType === 'university-degree') {
        createUniversityDegreeCredential(inputFile)
            .then(() => console.log('🎉 Processo concluído!'))
            .catch(error => console.error('💥 Falha:', error));
    } else {
        console.error('❌ Tipo de credencial não suportado:', credentialType);
        console.error('Tipos disponíveis: personal-data, university-degree');
        process.exit(1);
    }
}