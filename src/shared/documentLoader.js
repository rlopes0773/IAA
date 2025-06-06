import * as didKey from '@digitalbazaar/did-method-key';
import jsonld from 'jsonld';

// Configurar JSON-LD para desabilitar safe mode GLOBALMENTE
jsonld.documentLoader = jsonld.documentLoaders.node();

// Forçar desabilitar safe mode em todas as operações
const originalExpand = jsonld.expand;
jsonld.expand = async function(input, options = {}) {
  return originalExpand.call(this, input, { ...options, safe: false });
};

const originalToRDF = jsonld.toRDF;
jsonld.toRDF = async function(input, options = {}) {
  return originalToRDF.call(this, input, { ...options, safe: false });
};

/**
 * Document loader personalizado para VCs com Selective Disclosure
 * @param {string} url - URL para carregar
 * @returns {Promise<Object>} Document loader result
 */
export const documentLoader = async (url) => {
  console.log(`📋 Loading: ${url}`);
  
  if (url.startsWith('did:key:')) {
    try {
      const didUrl = url.split('#')[0];
      const { didDocument } = await didKey.driver().get({ did: didUrl });
      
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
  
  try {
    // Usar document loader sem safe mode
    const result = await jsonld.documentLoaders.node({ safe: false })(url);
    return result;
  } catch (error) {
    // Contextos locais como fallback
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
      },
      
      'https://w3id.org/security/data-integrity/v2': {
        "@context": {
          "@version": 1.1,
          "@protected": true,
          "id": "@id",
          "type": "@type",
          "sec": "https://w3id.org/security#",
          "xsd": "http://www.w3.org/2001/XMLSchema#",
          
          "DataIntegrityProof": {
            "@id": "sec:DataIntegrityProof"
          },
          
          "proof": {
            "@id": "sec:proof",
            "@type": "@id",
            "@container": "@graph"
          },
          "challenge": "sec:challenge",
          "created": {
            "@id": "http://purl.org/dc/terms/created",
            "@type": "xsd:dateTime"
          },
          "domain": "sec:domain",
          "expires": {
            "@id": "sec:expiration",
            "@type": "xsd:dateTime"
          },
          "nonce": "sec:nonce",
          "previousProof": {
            "@id": "sec:previousProof",
            "@type": "@id"
          },
          "proofPurpose": {
            "@id": "sec:proofPurpose",
            "@type": "@vocab"
          },
          "proofValue": {
            "@id": "sec:proofValue",
            "@type": "sec:multibase"
          },
          "verificationMethod": {
            "@id": "sec:verificationMethod",
            "@type": "@id"
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

/**
 * Document loader wrapper que força desabilitar safe mode em TODAS as operações
 * @param {string} url - URL para carregar
 * @returns {Promise<Object>} Document loader result
 */
export const safeDocumentLoader = async (url) => {
  const result = await documentLoader(url);
  
  // Interceptar e modificar TODAS as operações JSON-LD
  const originalDocumentLoader = result.documentLoader;
  if (originalDocumentLoader) {
    result.documentLoader = async (u) => {
      const res = await originalDocumentLoader(u);
      if (res.document && typeof res.document === 'object') {
        res.document._safe = false;
      }
      return res;
    };
  }
  
  if (result.document && typeof result.document === 'object') {
    result.document._safe = false;
  }
  
  return result;
};