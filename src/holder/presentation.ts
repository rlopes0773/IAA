import * as crypto from 'crypto';

export class Presentation {
    constructor() {
        // Construtor sem parâmetros
    }

    async createPresentation(credentials: any[], challenge?: string, holderDid?: string) {
        console.log(`Creating verifiable presentation with ${credentials.length} credentials...`);
        
        const holder = holderDid || credentials[0]?.credentialSubject?.id || 'did:example:holder123';
        
        interface VerifiablePresentation {
            "@context": string[];
            type: string[];
            verifiableCredential: any[];
            id: string;
            holder: string;
            proof?: any;
        }
        
        const basePresentation: VerifiablePresentation = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://w3id.org/security/data-integrity/v2"
            ],
            type: ["VerifiablePresentation"],
            verifiableCredential: credentials,
            id: `presentation-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            holder: holder
        };

        // 🔥 CALCULAR HASH DOS DADOS ANTES DE ADICIONAR A PROVA
        const dataHash = this.calculateDataHash(basePresentation);

        // Adicionar prova com hash dos dados
        basePresentation.proof = {
            type: "DataIntegrityProof",
            cryptosuite: "ecdsa-rdfc-2019",
            created: new Date().toISOString(),
            verificationMethod: holder + "#key-1",
            proofPurpose: "authentication",
            challenge: challenge || "default-challenge",
            dataHash: dataHash  // 🔥 Hash dos dados para verificação de integridade
        };

        return basePresentation;
    }

    private calculateDataHash(data: any): string {
        const normalizedData = this.normalizeObject(data);
        const dataString = JSON.stringify(normalizedData);
        return crypto.createHash('sha256').update(dataString, 'utf8').digest('hex');
    }

    private normalizeObject(obj: any): any {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.normalizeObject(item));
        }

        const sortedKeys = Object.keys(obj).sort();
        const normalizedObj: any = {};
        
        sortedKeys.forEach(key => {
            normalizedObj[key] = this.normalizeObject(obj[key]);
        });

        return normalizedObj;
    }
}

export default Presentation;