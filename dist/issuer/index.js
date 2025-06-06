"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Adicionar imports para selective disclosure
const vc = __importStar(require("@digitalbazaar/vc"));
const ecdsa_sd_2023_cryptosuite_1 = require("@digitalbazaar/ecdsa-sd-2023-cryptosuite");
const data_integrity_1 = require("@digitalbazaar/data-integrity");
const EcdsaMultikey = __importStar(require("@digitalbazaar/ecdsa-multikey"));
const didKey = __importStar(require("@digitalbazaar/did-method-key"));
const jsonld_1 = __importDefault(require("jsonld"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Configurar JSON-LD
jsonld_1.default.documentLoader = jsonld_1.default.documentLoaders.node();
// Document loader para suportar DIDs e contextos
const documentLoader = (url) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(`📋 Loading: ${url}`);
    if (url.startsWith('did:key:')) {
        try {
            const didUrl = url.split('#')[0];
            const { didDocument } = yield didKey.driver().get({ did: didUrl });
            if (url.includes('#')) {
                const fragment = url.split('#')[1];
                const verificationMethod = (_a = didDocument.verificationMethod) === null || _a === void 0 ? void 0 : _a.find(vm => vm.id === url || vm.id.endsWith(`#${fragment}`));
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
        }
        catch (error) {
            console.error(`❌ Erro ao resolver DID: ${url}`, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    try {
        const result = yield jsonld_1.default.documentLoaders.node()(url);
        return result;
    }
    catch (error) {
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
});
// Rota existente de health check
app.get('/health', (req, res) => {
    res.json({ status: 'Issuer service is running', timestamp: new Date().toISOString() });
});
// Nova rota para credenciais com Selective Disclosure
app.post('/issue-sd', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🚀 Issuing credential with Selective Disclosure...');
        // 1. Gerar chaves ECDSA P-256
        const keyPair = yield EcdsaMultikey.generate({
            curve: 'P-256'
        });
        const did = `did:key:${keyPair.publicKeyMultibase}`;
        keyPair.id = `${did}#${keyPair.publicKeyMultibase}`;
        keyPair.controller = did;
        // 2. Criar credencial com selective pointers
        const { credentialData, selectivePointers = [] } = req.body;
        const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            "id": `http://example.edu/credentials/${Date.now()}`,
            "type": ["VerifiableCredential"],
            "issuer": keyPair.controller,
            "issuanceDate": new Date().toISOString(),
            "credentialSubject": credentialData
        };
        // 3. Criar suite com selective disclosure
        const signSuite = new data_integrity_1.DataIntegrityProof({
            signer: keyPair.signer(),
            cryptosuite: (0, ecdsa_sd_2023_cryptosuite_1.createSignCryptosuite)({
                selectivePointers
            })
        });
        // 4. Assinar credencial
        const signedCredential = yield vc.issue({
            credential,
            suite: signSuite,
            documentLoader
        });
        console.log('✅ Credential with SD issued successfully');
        console.log('   Cryptosuite:', signedCredential.proof.cryptosuite);
        console.log('   Selective Pointers:', selectivePointers);
        res.json({
            success: true,
            credential: signedCredential,
            issuerDid: keyPair.controller,
            selectivePointers,
            metadata: {
                cryptosuite: signedCredential.proof.cryptosuite,
                created: signedCredential.proof.created,
                verificationMethod: signedCredential.proof.verificationMethod
            }
        });
    }
    catch (error) {
        console.error('❌ Error issuing SD credential:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}));
app.listen(PORT, () => {
    console.log(`🚀 Issuer service running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔒 SD Issuer: http://localhost:${PORT}/issue-sd`);
});
