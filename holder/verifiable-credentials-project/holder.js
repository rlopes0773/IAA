import * as DidKey from '@digitalbazaar/did-method-key';
import * as DidWeb from '@digitalbazaar/did-method-web';
import * as EcdsaMultikey from '@digitalbazaar/ecdsa-multikey';
import {
  cryptosuite as ecdsaRdfc2019Cryptosuite
} from '@digitalbazaar/ecdsa-rdfc-2019-cryptosuite';

import * as vc from '@digitalbazaar/vc';
import {CachedResolver} from '@digitalbazaar/did-io';
import {DataIntegrityProof} from '@digitalbazaar/data-integrity';
import {securityLoader} from '@digitalbazaar/security-document-loader';
import {contexts as diContexts} from '@digitalbazaar/data-integrity-context';
import fs from 'fs';
import path from 'path';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'url';

// Make crypto available globally
globalThis.crypto = webcrypto;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup documentLoader with security contexts
const loader = securityLoader();
loader.addDocuments({documents: diContexts});

// Load custom university degree context
const universityDegreeContext = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'contexts', 'university-degree-v1.json'), 'utf8')
);

// Map the context to the exact URL used in your credential
loader.addStatic(
  "https://example.org/contexts/university-degree/v1",
  universityDegreeContext
);

console.log('✅ Loaded university degree context for https://example.org/contexts/university-degree/v1');

// Load the JSON-LD contexts
loader.addStatic(
  "https://www.w3.org/ns/odrl.jsonld",
  await fetch("https://www.w3.org/ns/odrl.jsonld").then(res => res.json())
);

loader.addStatic(
  "https://www.w3.org/2018/credentials/examples/v1",
  await fetch("https://www.w3.org/2018/credentials/examples/v1").then(res => res.json())
);

const resolver = new CachedResolver();
const didKeyDriverMultikey = DidKey.driver();
const didWebDriver = DidWeb.driver();

// Only configure P-256 support (remove P-384 configuration)
didKeyDriverMultikey.use({
  multibaseMultikeyHeader: 'zDna',
  fromMultibase: EcdsaMultikey.from
});

didWebDriver.use({
  multibaseMultikeyHeader: 'zDna',
  fromMultibase: EcdsaMultikey.from
});

resolver.use(didKeyDriverMultikey);
resolver.use(didWebDriver);
loader.setDidResolver(resolver);

const documentLoader = loader.build();

//Creates a VP with an embedded VC
async function main({verifiableCredential, documentLoader, challenge, domain, holderDid}) {
  const vpChallenge = challenge || process.env.CHALLENGE || 'abc123';
  const vpDomain = domain || process.env.DOMAIN || 'https://example.com/';

  console.log('Creating VP with:');
  console.log('- Challenge:', vpChallenge);
  console.log('- Domain:', vpDomain);
  console.log('- Using DID:Key method with P-256');

  // Generate a new key pair for the VP (P-256)
  const vpSeed = new Uint8Array(32);
  crypto.getRandomValues(vpSeed);
  
  const vpEcdsaKeyPair = await EcdsaMultikey.generate({
    curve: 'P-256',
    seed: vpSeed
  });

  // Create DID document using did:key method
  const { didDocument: vpDidDocument, keyPair: vpKeyPair, methodFor: vpMethodFor } = await didKeyDriverMultikey.fromKeyPair({
    verificationKeyPair: vpEcdsaKeyPair
  });

  // Set up key pair for signing
  const didKeyAuth = vpMethodFor({purpose: 'authentication'});
  vpEcdsaKeyPair.id = didKeyAuth.id;
  vpEcdsaKeyPair.controller = vpDidDocument.id;

  console.log('Generated DID:', vpDidDocument.id);
  console.log('Verification method ID:', vpEcdsaKeyPair.id);

  // Export the key pair with all necessary properties
  const exportedKeyPair = vpEcdsaKeyPair.export({
    publicKey: true,
    privateKey: true,
    includeContext: true
  });

  // Ensure we have all required properties
  const keyPairData = {
    ...exportedKeyPair,
    id: vpEcdsaKeyPair.id,
    controller: vpEcdsaKeyPair.controller,
    type: vpEcdsaKeyPair.type || 'Multikey'
  };

  console.log('Saving key pair data with keys:', Object.keys(keyPairData));
  
  await fs.promises.writeFile('vpEcdsaKeyPair.json', JSON.stringify(keyPairData, null, 2));
  console.log('Key pair saved to vpEcdsaKeyPair.json');

  const vpSigningSuite = new DataIntegrityProof({
    signer: vpEcdsaKeyPair.signer(),
    cryptosuite: ecdsaRdfc2019Cryptosuite
  });

  // Add the DID document to the document loader
  loader.addStatic(vpDidDocument.id, vpDidDocument);

  // Create verification method document
  const vpDidVm = structuredClone(vpDidDocument.verificationMethod[0]);
  vpDidVm['@context'] = 'https://w3id.org/security/multikey/v1';
  loader.addStatic(vpDidVm.id, vpDidVm);

  // Create the presentation with appropriate context
  const presentation = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/security/data-integrity/v2'
    ],
    type: ['VerifiablePresentation'],
    holder: vpDidDocument.id,
    verifiableCredential: [verifiableCredential]
  };

  console.log('Creating presentation...');
  console.log('Credential contexts being used:', verifiableCredential['@context']);

  // Sign the presentation with event handler to manage warnings
  const vp = await vc.signPresentation({
    presentation,
    suite: vpSigningSuite,
    challenge: vpChallenge,
    domain: vpDomain,
    documentLoader,
    eventHandler: function(event) {
      // Handle warnings but don't throw errors
      if (event.level === 'warning') {
        console.warn('JSON-LD Warning:', event.message);
        return;
      }
      // Only throw on actual errors
      if (event.level === 'error') {
        throw new Error(event.message);
      }
    }
  });

  console.log('VP created successfully');
  console.log('VP:', JSON.stringify(vp, null, 2));

  // Save the VP to file
  await fs.promises.writeFile('vp.json', JSON.stringify(vp, null, 2));
  console.log('VP saved to vp.json');

  return vp;
}

console.log("Loading vc.json");
try {
  const verifiableCredential = JSON.parse(fs.readFileSync('vc.json', 'utf8'));

  if (verifiableCredential) {
    console.log("Creating Verifiable Presentation");
    console.log("Loaded credential contexts:", verifiableCredential['@context']);
    
    // Get parameters from environment variables or use defaults
    const challenge = process.env.CHALLENGE || 'abc123';
    const domain = process.env.DOMAIN || 'https://example.com/';
    
    await main({
      verifiableCredential, 
      documentLoader, 
      challenge, 
      domain
    });
  } else {
    console.log("VC not found or invalid");
  }
} catch (error) {
  console.error("Error loading or processing VC:", error);
  process.exit(1);
}