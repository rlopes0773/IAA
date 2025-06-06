import * as vc from '@digitalbazaar/vc';
import { createSignCryptosuite, createVerifyCryptosuite } from '@digitalbazaar/ecdsa-sd-2023-cryptosuite';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import * as EcdsaMultikey from '@digitalbazaar/ecdsa-multikey';
import * as didKey from '@digitalbazaar/did-method-key';
import jsonld from 'jsonld';

// Configurar JSON-LD para desabilitar safe mode globalmente
jsonld.documentLoader = jsonld.documentLoaders.node();

// Document loader personalizado corrigido
const documentLoader = async (url) => {
  console.log(`📋 Loading: ${url}`);
  
  // Para DIDs do tipo did:key, usar o driver corretamente
  if (url.startsWith('did:key:')) {
    try {
      // Extrair apenas o DID (sem fragment)
      const didUrl = url.split('#')[0];
      const { didDocument } = await didKey.driver().get({ did: didUrl });
      
      // Se o URL tem um fragment, retornar a chave específica
      if (url.includes('#')) {
        const fragment = url.split('#')[1];
        const verificationMethod = didDocument.verificationMethod?.find(
          vm => vm.id === url || vm.id.endsWith(`#${fragment}`)
        );
        
        if (verificationMethod) {
          return {
            contextUrl: null,
            document: verificationMethod,
            documentUrl: url
          };
        }
      }
      
      return {
        contextUrl: null,
        document: didDocument,
        documentUrl: url
      };
    } catch (error) {
      console.error(`❌ Erro ao resolver DID: ${url}`, error.message);
      throw error;
    }
  }
  
  // Usar o document loader padrão para contextos remotos
  try {
    const result = await jsonld.documentLoaders.node()(url);
    return result;
  } catch (error) {
    // Se falhar, tentar contextos locais
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
              "@protected": true,
              "id": "@id",
              "type": "@type",
              "credentialSchema": {
                "@id": "https://www.w3.org/2018/credentials#credentialSchema",
                "@type": "@id"
              },
              "credentialStatus": {
                "@id": "https://www.w3.org/2018/credentials#credentialStatus",
                "@type": "@id"
              },
              "credentialSubject": {
                "@id": "https://www.w3.org/2018/credentials#credentialSubject",
                "@type": "@id"
              },
              "evidence": {
                "@id": "https://www.w3.org/2018/credentials#evidence",
                "@type": "@id"
              },
              "expirationDate": {
                "@id": "https://www.w3.org/2018/credentials#expirationDate",
                "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
              },
              "holder": {
                "@id": "https://www.w3.org/2018/credentials#holder",
                "@type": "@id"
              },
              "issued": {
                "@id": "https://www.w3.org/2018/credentials#issued",
                "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
              },
              "issuer": {
                "@id": "https://www.w3.org/2018/credentials#issuer",
                "@type": "@id"
              },
              "issuanceDate": {
                "@id": "https://www.w3.org/2018/credentials#issuanceDate",
                "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
              },
              "proof": {
                "@id": "https://w3id.org/security#proof",
                "@type": "@id",
                "@container": "@graph"
              },
              "refreshService": {
                "@id": "https://www.w3.org/2018/credentials#refreshService",
                "@type": "@id"
              },
              "termsOfUse": {
                "@id": "https://www.w3.org/2018/credentials#termsOfUse",
                "@type": "@id"
              },
              "validFrom": {
                "@id": "https://www.w3.org/2018/credentials#validFrom",
                "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
              },
              "validUntil": {
                "@id": "https://www.w3.org/2018/credentials#validUntil",
                "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
              }
            }
          },
          "VerifiablePresentation": {
            "@id": "https://www.w3.org/2018/credentials#VerifiablePresentation",
            "@context": {
              "@protected": true,
              "id": "@id",
              "type": "@type",
              "holder": {
                "@id": "https://www.w3.org/2018/credentials#holder",
                "@type": "@id"
              },
              "proof": {
                "@id": "https://w3id.org/security#proof",
                "@type": "@id",
                "@container": "@graph"
              },
              "verifiableCredential": {
                "@id": "https://www.w3.org/2018/credentials#verifiableCredential",
                "@type": "@id",
                "@container": "@graph"
              }
            }
          },
          "credentialSchema": {
            "@id": "https://www.w3.org/2018/credentials#credentialSchema",
            "@type": "@id"
          },
          "credentialStatus": {
            "@id": "https://www.w3.org/2018/credentials#credentialStatus",
            "@type": "@id"
          },
          "credentialSubject": {
            "@id": "https://www.w3.org/2018/credentials#credentialSubject",
            "@type": "@id"
          },
          "evidence": {
            "@id": "https://www.w3.org/2018/credentials#evidence",
            "@type": "@id"
          },
          "expirationDate": {
            "@id": "https://www.w3.org/2018/credentials#expirationDate",
            "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
          },
          "holder": {
            "@id": "https://www.w3.org/2018/credentials#holder",
            "@type": "@id"
          },
          "issued": {
            "@id": "https://www.w3.org/2018/credentials#issued",
            "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
          },
          "issuer": {
            "@id": "https://www.w3.org/2018/credentials#issuer",
            "@type": "@id"
          },
          "issuanceDate": {
            "@id": "https://www.w3.org/2018/credentials#issuanceDate",
            "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
          },
          "proof": {
            "@id": "https://w3id.org/security#proof",
            "@type": "@id",
            "@container": "@graph"
          },
          "refreshService": {
            "@id": "https://www.w3.org/2018/credentials#refreshService",
            "@type": "@id"
          },
          "termsOfUse": {
            "@id": "https://www.w3.org/2018/credentials#termsOfUse",
            "@type": "@id"
          },
          "validFrom": {
            "@id": "https://www.w3.org/2018/credentials#validFrom",
            "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
          },
          "validUntil": {
            "@id": "https://www.w3.org/2018/credentials#validUntil",
            "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
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

    throw error;
  }
};

// Document loader wrapper que desabilita safe mode
const safeDocumentLoader = async (url) => {
  const result = await documentLoader(url);
  // Forçar safe mode = false no processo de loading
  if (result.document && typeof result.document === 'object') {
    result.document._safe = false;
  }
  return result;
};

async function testSelectiveDisclosure() {
  console.log('🚀 Testando Selective Disclosure com ECDSA-SD-2023...\n');

  try {
    // 1. Gerar chaves ECDSA P-256 com DID real
    console.log('1. Gerando chaves ECDSA P-256...');
    const keyPair = await EcdsaMultikey.generate({
      curve: 'P-256'
    });
    
    // Criar um DID:key real a partir da chave pública
    const did = `did:key:${keyPair.publicKeyMultibase}`;
    keyPair.id = `${did}#${keyPair.publicKeyMultibase}`;
    keyPair.controller = did;
    
    console.log('✅ Chaves geradas');
    console.log('   Key ID:', keyPair.id);
    console.log('   Controller:', keyPair.controller);

    // 2. Criar credencial mais simples, usando apenas contextos padrão
    const credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1"
      ],
      "id": `http://example.edu/credentials/${Date.now()}`,
      "type": ["VerifiableCredential"],
      "issuer": keyPair.controller,
      "issuanceDate": new Date().toISOString(),
      "credentialSubject": {
        "id": "did:example:student123",
        "http://schema.org/name": "João Silva",
        "http://example.org/degree": {
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": "http://example.org/BachelorDegree",
          "http://schema.org/name": "Bachelor of Computer Science", 
          "http://example.org/university": "Universidade de Lisboa",
          "http://example.org/graduationDate": "2023-06-15"
        },
        "http://example.org/gpa": "3.8"
      }
    };

    console.log('\n2. Credencial criada (usando IRIs absolutos):');
    console.log(JSON.stringify(credential, null, 2));

    // 3. Criar cryptosuite para assinatura com selective disclosure
    const signSuite = new DataIntegrityProof({
      signer: keyPair.signer(),
      cryptosuite: createSignCryptosuite({
        // Definir quais campos podem ser seletivamente divulgados
        selectivePointers: [
          '/credentialSubject/http://schema.org/name',
          '/credentialSubject/http://example.org/gpa',
          '/credentialSubject/http://example.org/degree/http://example.org/university',
          '/credentialSubject/http://example.org/degree/http://example.org/graduationDate'
        ]
      })
    });

    // 4. Assinar a credencial com selective disclosure
    console.log('\n3. Assinando credencial com SD...');
    
    const signedCredential = await vc.issue({
      credential,
      suite: signSuite,
      documentLoader: safeDocumentLoader
    });

    console.log('✅ Credencial assinada com selective disclosure!');
    console.log('\n   Proof criado:');
    console.log('   Type:', signedCredential.proof.type);
    console.log('   Created:', signedCredential.proof.created);
    console.log('   Verification Method:', signedCredential.proof.verificationMethod);

    // 5. Criar suite para verificação
    const verifySuite = new DataIntegrityProof({
      cryptosuite: createVerifyCryptosuite()
    });

    // 6. Verificar a credencial completa
    console.log('\n4. Verificando credencial completa...');
    const fullResult = await vc.verifyCredential({
      credential: signedCredential,
      suite: verifySuite,
      documentLoader: safeDocumentLoader
    });

    console.log('✅ Resultado da verificação completa:');
    console.log('   Verified:', fullResult.verified);
    if (fullResult.error) {
      console.log('   Errors:', fullResult.error);
    }

    // 7. Mostrar a credencial completa assinada
    console.log('\n📄 Credencial Completa Assinada:');
    console.log(JSON.stringify(signedCredential, null, 2));

    // 8. Demonstrar selective disclosure
    console.log('\n5. Demonstrando Selective Disclosure...');
    console.log('   📋 Campos configurados para selective disclosure:');
    console.log('   - /credentialSubject/http://schema.org/name (pode ser ocultado)');
    console.log('   - /credentialSubject/http://example.org/gpa (pode ser ocultado)'); 
    console.log('   - /credentialSubject/http://example.org/degree/http://example.org/university (pode ser ocultado)');
    console.log('   - /credentialSubject/http://example.org/degree/http://example.org/graduationDate (pode ser ocultado)');
    
    console.log('\n   ✅ A credencial está preparada para selective disclosure!');

    return {
      keyPair,
      credential: signedCredential,
      verified: fullResult.verified
    };

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Executar o teste
testSelectiveDisclosure()
  .then(result => {
    console.log('\n🎉 Teste de Selective Disclosure concluído!');
    console.log('   Credencial verificada:', result.verified);
    
    if (result.verified) {
      console.log('\n✅ SUCESSO! A implementação está funcionando:');
      console.log('   - Credencial assinada com ECDSA-SD-2023 ✅');
      console.log('   - Selective pointers configurados ✅');  
      console.log('   - Verificação da assinatura ✅');
    } else {
      console.log('\n⚠️  Verification falhou, mas a assinatura foi criada');
    }
    
    console.log('\n📋 Próximos passos:');
    console.log('   - Implementar função de derivação para ocultar campos');
    console.log('   - Criar apresentações com selective disclosure');
    console.log('   - Integrar com interface web');
  })
  .catch(error => {
    console.error('\n💥 Falha no teste:', error);
    process.exit(1);
  });

export { testSelectiveDisclosure };