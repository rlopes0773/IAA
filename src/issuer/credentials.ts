class Credential {
    id: string;
    type: string[];
    issuer: string;
    claims: Record<string, any>;

    constructor(id: string, type: string[], issuer: string, claims: Record<string, any>) {
        this.id = id;
        this.type = type;
        this.issuer = issuer;
        this.claims = claims;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            issuer: this.issuer,
            claims: this.claims
        };
    }
}

export class Credentials {
    constructor() {
        // Construtor sem parâmetros obrigatórios
    }

    async createCredential(data: any) {
        console.log('Creating credential with data:', data);
        
        const credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://w3id.org/security/data-integrity/v2"
            ],
            type: ["VerifiableCredential", data.type || "CustomCredential"],
            issuer: "did:example:issuer123",
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
                id: data.subject,
                ...data
            },
            proof: {
                type: "DataIntegrityProof",
                cryptosuite: "ecdsa-rdfc-2019",
                created: new Date().toISOString(),
                verificationMethod: "did:example:issuer123#key-1",
                proofPurpose: "assertionMethod"
            }
        };

        return credential;
    }
}

export default Credential;