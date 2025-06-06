import * as vc from '@digitalbazaar/vc';
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
import { driver } from '@digitalbazaar/did-method-key';

// Document loader simplificado
const documentLoader = async (url) => {
  // Para DIDs do tipo did:key, usar o driver
  if (url.startsWith('did:key:')) {
    const { document } = await driver.get({ did: url });
    return {
      contextUrl: null,
      document,
      documentUrl: url
    };
  }
  
  // Contextos básicos W3C
  const contexts = {
    'https://www.w3.org/2018/credentials/v1': {
      "@context": {
        "@version": 1.1,
        "@protected": true,
        "id": "@id",
        "type": "@type",
        "VerifiableCredential": {
          "@id": "https://www.w3.org/2018/credentials#VerifiableCredential",
          "@context": {
            "@version": 1.1,
            "@protected": true,
            "id": "@id",
            "type": "@type",
            "cred": "https://www.w3.org/2018/credentials#",
            "credentialSubject": {
              "@id": "cred:credentialSubject",
              "@type": "@id"
            },
            "issuer": {
              "@id": "cred:issuer",
              "@type": "@id"
            },
            "issuanceDate": {
              "@id": "cred:issuanceDate",
              "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
            },
            "proof": {
              "@id": "https://w3id.org/security#proof",
              "@type": "@id",
              "@container": "@graph"
            }
          }
        },
        "VerifiablePresentation": {
          "@id": "https://www.w3.org/2018/credentials#VerifiablePresentation",
          "@context": {
            "@version": 1.1,
            "@protected": true,
            "id": "@id",
            "type": "@type",
            "cred": "https://www.w3.org/2018/credentials#",
            "holder": {
              "@id": "cred:holder",
              "@type": "@id"
            },
            "verifiableCredential": {
              "@id": "cred:verifiableCredential",
              "@type": "@id",
              "@container": "@graph"
            }
          }
        }
      }
    },
    'https://w3id.org/security/suites/ed25519-2020/v1': {
      "@context": {
        "@version": 1.1,
        "@protected": true,
        "id": "@id",
        "type": "@type",
        "Ed25519VerificationKey2020": {
          "@id": "https://w3id.org/security#Ed25519VerificationKey2020",
          "@context": {
            "@version": 1.1,
            "@protected": true,
            "id": "@id",
            "type": "@type",
            "controller": {
              "@id": "https://w3id.org/security#controller",
              "@type": "@id"
            },
            "publicKeyMultibase": {
              "@id": "https://w3id.org/security#publicKeyMultibase"
            }
          }
        },
        "Ed25519Signature2020": {
          "@id": "https://w3id.org/security#Ed25519Signature2020",
          "@context": {
            "@version": 1.1,
            "@protected": true,
            "id": "@id",
            "type": "@type",
            "challenge": "https://w3id.org/security#challenge",
            "created": {
              "@id": "http://purl.org/dc/terms/created",
              "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
            },
            "domain": "https://w3id.org/security#domain",
            "proofPurpose": {
              "@id": "https://w3id.org/security#proofPurpose",
              "@type": "@vocab"
            },
            "proofValue": {
              "@id": "https://w3id.org/security#proofValue"
            },
            "verificationMethod": {
              "@id": "https://w3id.org/security#verificationMethod",
              "@type": "@id"
            }
          }
        }
      }
    }
  };

  if (contexts[url]) {
    return {
      contextUrl: null,
      document: contexts[url],
      documentUrl: url
    };
  }

  throw new Error(`Context not found: ${url}`);
};

async function testDigitalBazaar() {
  console.log('🚀 Testando Digital Bazaar VC...\n');

  try {
    // 1. Gerar par de chaves Ed25519
    console.log('1. Gerando chaves...');
    const keyPair = await Ed25519VerificationKey2020.generate();
    console.log('✅ Chaves geradas');
    console.log('   Public Key ID:', keyPair.id);
    console.log('   Controller:', keyPair.controller);

    // 2. Criar suite de assinatura
    const suite = new Ed25519Signature2020({
      key: keyPair
    });

    // 3. Documento de credencial simples
    const credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1"
      ],
      "id": `http://example.edu/credentials/${Date.now()}`,
      "type": ["VerifiableCredential", "UniversityDegreeCredential"],
      "issuer": keyPair.controller,
      "issuanceDate": new Date().toISOString(),
      "credentialSubject": {
        "id": "did:example:ebfeb1f712ebc6f1c276e12ec21",
        "degree": {
          "type": "BachelorDegree",
          "name": "Bachelor of Science and Arts"
        }
      }
    };

    console.log('\n2. Credencial criada:');
    console.log(JSON.stringify(credential, null, 2));

    // 4. Assinar a credencial
    console.log('\n3. Assinando credencial...');
    const signedCredential = await vc.issue({
      credential,
      suite,
      documentLoader
    });

    console.log('✅ Credencial assinada com sucesso!');
    console.log('\n   Credencial completa:');
    console.log(JSON.stringify(signedCredential, null, 2));

    // 5. Verificar a credencial
    console.log('\n4. Verificando credencial...');
    const result = await vc.verifyCredential({
      credential: signedCredential,
      suite,
      documentLoader
    });

    console.log('✅ Resultado da verificação:');
    console.log('   Verified:', result.verified);
    if (result.error) {
      console.log('   Errors:', result.error);
    }

    return {
      keyPair,
      credential: signedCredential,
      verified: result.verified
    };

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Executar o teste
testDigitalBazaar()
  .then(result => {
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('   Credencial verificada:', result.verified);
  })
  .catch(error => {
    console.error('\n💥 Falha no teste:', error);
    process.exit(1);
  });

export { testDigitalBazaar };