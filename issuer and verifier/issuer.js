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

// Only configure P-256 support
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

async function main({credential, documentLoader}) {
  // generate example keypair for VC signer
  const vcEcdsaKeyPair = await EcdsaMultikey.generate({
    curve: 'P-256',
    id: 'did:key:test', 
    controller: 'did:key:test'
  });

  const {
    didDocument: vcDidDocument
  } = await didKeyDriverMultikey.fromKeyPair({
    verificationKeyPair: vcEcdsaKeyPair
  });

  vcEcdsaKeyPair.id = vcDidDocument.assertionMethod[0];
  vcEcdsaKeyPair.controller = vcDidDocument.id;

  // ensure issuer matches key controller
  credential.issuer = vcEcdsaKeyPair.controller;

  // setup ecdsa-rdfc-2019 signing suite
  const vcSigningSuite = new DataIntegrityProof({
    signer: vcEcdsaKeyPair.signer(),
    cryptosuite: ecdsaRdfc2019Cryptosuite
  });

  console.log('Credential to sign:', JSON.stringify(credential, null, 2));

  // sign credential
  const verifiableCredential = await vc.issue({
    credential,
    suite: vcSigningSuite,
    documentLoader
  });

  console.log('SIGNED CREDENTIAL:');
  console.log(JSON.stringify(verifiableCredential, null, 2));
  fs.writeFileSync('vc.json', JSON.stringify(verifiableCredential, null, 2));
  
  return verifiableCredential;
}

export async function createPersonalDataCredential() {
  try {
    console.log("Loading credential.json");
    const credentialData = JSON.parse(fs.readFileSync('credential.json', 'utf8'));
    
    // Ajustar as datas
    credentialData.issuanceDate = new Date().toISOString();
    credentialData.expirationDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
    
    console.log("Signing Credential...");
    const signedCredential = await main({credential: credentialData, documentLoader});
    
    console.log('✅ Credencial de dados pessoais criada e assinada com sucesso!');
    console.log('📄 Credencial salva em vc.json');
    
    return signedCredential;
  } catch (error) {
    console.error('❌ Erro ao criar credencial:', error);
    throw error;
  }
}

// Executa se for chamado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  createPersonalDataCredential()
    .then(() => console.log('🎉 Processo concluído!'))
    .catch(error => console.error('💥 Falha:', error));
}