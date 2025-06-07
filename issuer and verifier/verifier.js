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
import { webcrypto } from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make crypto available globally
globalThis.crypto = webcrypto;

// setup documentLoader with security contexts
const loader = securityLoader();
loader.addDocuments({documents: diContexts});

//Load the JSON-LD contexts
loader.addStatic(
  "https://www.w3.org/ns/odrl.jsonld",
  await fetch("https://www.w3.org/ns/odrl.jsonld").then(res => res.json())
);

loader.addStatic(
  "https://www.w3.org/2018/credentials/examples/v1",
  await fetch("https://www.w3.org/2018/credentials/examples/v1").then(res => res.json())
);

// Load custom university degree context
const universityDegreeContext = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'contexts', 'university-degree-v1.json'), 'utf8')
);

loader.addStatic(
  "https://example.org/contexts/university-degree/v1",
  universityDegreeContext
);

const resolver = new CachedResolver();
const didKeyDriverMultikey = DidKey.driver();
const didWebDriver = DidWeb.driver();

// Only configure P-256 support (zDna header)
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

//Verifies a VC PRESENTATION 
async function main({verifyablePresentation, documentLoader, challenge, domain}) {
  console.log('Starting verification with challenge:', challenge, 'domain:', domain);
  
  try {
    // Read the VP to get the holder DID
    const holderDid = verifyablePresentation.holder;
    console.log('Holder DID:', holderDid);

    // Setup verification suite
    const vpVerifyingSuite = new DataIntegrityProof({
      cryptosuite: ecdsaRdfc2019Cryptosuite
    });

    console.log('Verifying presentation using document loader...');

    // Verify signed presentation directly
    const verifyPresentationResult = await vc.verify({
      presentation: verifyablePresentation,
      challenge,
      domain,
      suite: vpVerifyingSuite,
      documentLoader
    });

    console.log('VERIFY PRESENTATION RESULT:');
    console.log(JSON.stringify(verifyPresentationResult, null, 2));
    
    if(verifyPresentationResult.error) {
      console.log('VP ERROR DETAILS:', verifyPresentationResult.error);
      if(verifyPresentationResult.error.errors) {
        verifyPresentationResult.error.errors.forEach((err, index) => {
          console.log(`Error ${index}:`, err.message);
          if(err.stack) console.log('Stack:', err.stack);
        });
      }
    }

    // Add result output for API
    console.log('Verification result:', JSON.stringify(verifyPresentationResult));
    console.log('Presentation verified:', verifyPresentationResult.verified);
    
    return verifyPresentationResult;
    
  } catch (error) {
    console.error('Error in verification:', error);
    throw error;
  }
}

console.log("Loading VP file");
try {
  const vpFile = process.env.VP_FILE || 'vp.json';
  
  let verifyablePresentation;
  try {
    verifyablePresentation = JSON.parse(fs.readFileSync(vpFile, 'utf8'));
  } catch (error) {
    console.error(`Error loading ${vpFile}:`, error.message);
    console.log('Please provide a verifiable presentation to verify.');
    process.exit(1);
  }

  if (verifyablePresentation) {
    console.log("Verifying Verifiable Presentation");
    const challenge = process.env.VERIFY_CHALLENGE || 'abc123';
    const domain = process.env.VERIFY_DOMAIN || 'https://example.com/';
    
    await main({verifyablePresentation, documentLoader, challenge, domain});  
  } else {
    console.log("VP not found or invalid");
  }
} catch (error) {
  console.error("Error loading or processing VP:", error);
  process.exit(1);
}
