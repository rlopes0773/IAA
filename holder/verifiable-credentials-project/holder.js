import * as DidKey from '@digitalbazaar/did-method-key';
import * as EcdsaMultikey from '@digitalbazaar/ecdsa-multikey';
import { cryptosuite as ecdsaRdfc2019Cryptosuite } from '@digitalbazaar/ecdsa-rdfc-2019-cryptosuite';
import * as vc from '@digitalbazaar/vc';
import { CachedResolver } from '@digitalbazaar/did-io';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { securityLoader } from '@digitalbazaar/security-document-loader';
import { contexts as diContexts } from '@digitalbazaar/data-integrity-context';
import fs from 'fs';
import path from 'path';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'url';

// Global setup
globalThis.crypto = webcrypto;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Document loader setup
const loader = securityLoader();
loader.addDocuments({ documents: diContexts });

// Load contexts
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

// Create VP with embedded VC (MODIFICADO para nomes únicos)
async function createVerifiablePresentation({ verifiableCredential, challenge, domain, holderDid }) {
    const vpChallenge = challenge || process.env.CHALLENGE || 'abc123';
    const vpDomain = domain || process.env.DOMAIN || 'https://example.com/';

    console.log('Creating VP with:', { challenge: vpChallenge, domain: vpDomain });

    // Se verifiableCredential for um array, processar múltiplas credenciais
    const credentials = Array.isArray(verifiableCredential) ? verifiableCredential : [verifiableCredential];
    console.log(`Processing ${credentials.length} credential(s)`);

    // Verificar se há informação de VP específica no arquivo multi-credential
    let vpInfo = null;
    const files = fs.readdirSync('.');
    const multiVcFile = files.find(f => f.startsWith('multi_vc_') && f.endsWith('.json'));
    
    if (multiVcFile) {
        try {
            const multiVcData = JSON.parse(fs.readFileSync(multiVcFile, 'utf8'));
            vpInfo = {
                name: multiVcData.vpName || 'Multi-Credential VP',
                id: multiVcData.vpId || `vp_${Date.now()}`
            };
        } catch (error) {
            console.warn('Failed to read VP info from multi-credential file');
        }
    }

    // Determinar nome do arquivo VP
    let vpFileName = 'vp.json'; // padrão para compatibilidade
    let vpFileNameUnique = 'vp.json';
    
    if (vpInfo) {
        vpFileNameUnique = `${vpInfo.id}.json`;
        console.log(`📄 Criando VP "${vpInfo.name}" (${vpFileNameUnique})`);
    } else if (credentials.length === 1) {
        // Para uma única credencial, verificar se é a original
        const singleCred = credentials[0];
        const isOriginalPersonalData = singleCred.type?.includes('PersonalDataCredential') && 
            !singleCred.credentialSubject.certificationInfo;
        
        if (isOriginalPersonalData) {
            vpFileNameUnique = 'originalVP.json';
            console.log('📄 Criando VP original (originalVP.json) para credencial de dados pessoais');
        } else {
            const vpId = `vp_single_${Date.now()}`;
            vpFileNameUnique = `${vpId}.json`;
            console.log(`📄 Criando VP única (${vpFileNameUnique})`);
        }
    } else {
        // Para múltiplas credenciais sem info específica
        const vpId = `vp_multi_${Date.now()}`;
        vpFileNameUnique = `${vpId}.json`;
        console.log(`📄 Criando VP multi-credencial (${vpFileNameUnique})`);
    }

    // Generate key pair for VP (P-256)
    const vpSeed = new Uint8Array(32);
    crypto.getRandomValues(vpSeed);
    
    const vpEcdsaKeyPair = await EcdsaMultikey.generate({
        curve: 'P-256',
        seed: vpSeed
    });

    // Create DID document
    const { didDocument, keyPair, methodFor } = await didKeyDriver.fromKeyPair({
        verificationKeyPair: vpEcdsaKeyPair
    });

    // Set up key pair for signing
    const didKeyAuth = methodFor({ purpose: 'authentication' });
    vpEcdsaKeyPair.id = didKeyAuth.id;
    vpEcdsaKeyPair.controller = didDocument.id;

    console.log('Generated DID:', didDocument.id);

    // Export and save key pair
    const exportedKeyPair = {
        ...vpEcdsaKeyPair.export({ publicKey: true, privateKey: true, includeContext: true }),
        id: vpEcdsaKeyPair.id,
        controller: vpEcdsaKeyPair.controller,
        type: vpEcdsaKeyPair.type || 'Multikey'
    };

    await fs.promises.writeFile('vpEcdsaKeyPair.json', JSON.stringify(exportedKeyPair, null, 2));
    console.log('Key pair saved to vpEcdsaKeyPair.json');

    // Setup signing suite
    const vpSigningSuite = new DataIntegrityProof({
        signer: vpEcdsaKeyPair.signer(),
        cryptosuite: ecdsaRdfc2019Cryptosuite
    });

    // Add DID document to loader
    loader.addStatic(didDocument.id, didDocument);

    // Add verification method to loader
    const vpDidVm = { ...didDocument.verificationMethod[0], '@context': 'https://w3id.org/security/multikey/v1' };
    loader.addStatic(vpDidVm.id, vpDidVm);

    // Consolidar todos os contextos das credenciais
    const allContexts = new Set([
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/data-integrity/v2'
    ]);

    // Adicionar contextos específicos de cada credencial
    credentials.forEach(cred => {
        if (cred['@context']) {
            if (Array.isArray(cred['@context'])) {
                cred['@context'].forEach(ctx => {
                    if (typeof ctx === 'string') allContexts.add(ctx);
                });
            } else if (typeof cred['@context'] === 'string') {
                allContexts.add(cred['@context']);
            }
        }
    });

    // Create presentation with unified contexts
    const presentation = {
        '@context': Array.from(allContexts),
        type: ['VerifiablePresentation'],
        holder: didDocument.id,
        verifiableCredential: credentials
    };

    console.log('Creating presentation with unified contexts:', Array.from(allContexts));
    console.log(`Including ${credentials.length} credential(s) in VP`);

    // Sign presentation with enhanced error handling
    const vp = await vc.signPresentation({
        presentation,
        suite: vpSigningSuite,
        challenge: vpChallenge,
        domain: vpDomain,
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

    console.log('VP created successfully with', credentials.length, 'credential(s)');

    // Save VP to files (tanto o nome específico quanto vp.json para compatibilidade)
    await fs.promises.writeFile(vpFileNameUnique, JSON.stringify(vp, null, 2));
    await fs.promises.writeFile('vp.json', JSON.stringify(vp, null, 2)); // compatibilidade
    
    console.log(`VP saved to ${vpFileNameUnique} and vp.json (compatibility)`);

    return vp;
}

// Main execution modificado para suportar múltiplas credenciais (CORRIGIDO - sem duplicação)
async function main() {
    console.log("Loading credential(s)");
    
    try {
        let verifiableCredential;
        let isMultiCredential = false;
        
        // Primeiro tentar carregar arquivo de múltiplas credenciais
        const files = fs.readdirSync('.');
        const multiVcFile = files.find(f => f.startsWith('multi_vc_') && f.endsWith('.json'));
        
        if (multiVcFile) {
            console.log(`Found multi-credential file: ${multiVcFile}`);
            try {
                const multiVcData = JSON.parse(fs.readFileSync(multiVcFile, 'utf8'));
                verifiableCredential = multiVcData.credentials; // Array de credenciais
                isMultiCredential = true;
                console.log(`✅ Loaded ${multiVcData.selectedCount} credentials from ${multiVcFile}`);
                console.log('Credentials loaded:');
                multiVcData.credentials.forEach((cred, index) => {
                    const credType = cred.type?.includes('UniversityDegreeCredential') ? 'University Degree' : 'Personal Data';
                    const credName = cred.credentialSubject.studentName || cred.credentialSubject.name;
                    console.log(`  ${index + 1}. ${credType}: ${credName}`);
                });
            } catch (error) {
                console.warn('Failed to load multi-credential file:', error.message);
                isMultiCredential = false;
            }
        }
        
        // Se não conseguiu carregar multi-credential, tentar vc.json
        if (!isMultiCredential) {
            try {
                console.log("Loading single credential from vc.json");
                verifiableCredential = JSON.parse(fs.readFileSync('vc.json', 'utf8'));
                console.log("✅ Loaded single credential from vc.json");
            } catch (error) {
                throw new Error("No valid credential file found (neither multi_vc_*.json nor vc.json)");
            }
        }
        
        if (!verifiableCredential) {
            throw new Error("No credentials loaded");
        }

        console.log("Creating Verifiable Presentation");
        
        if (Array.isArray(verifiableCredential)) {
            console.log(`Processing ${verifiableCredential.length} credentials`);
            verifiableCredential.forEach((cred, index) => {
                console.log(`Credential ${index + 1}:`);
                console.log(`  Type: ${cred.type}`);
                console.log(`  Contexts: ${JSON.stringify(cred['@context'])}`);
                if (cred.credentialSubject.studentName) {
                    console.log(`  Student: ${cred.credentialSubject.studentName}`);
                    console.log(`  Degree: ${cred.credentialSubject.degreeName}`);
                } else {
                    console.log(`  Name: ${cred.credentialSubject.name}`);
                }
            });
        } else {
            console.log("Processing single credential");
            console.log("Credential type:", verifiableCredential.type);
            console.log("Loaded credential contexts:", verifiableCredential['@context']);
        }
        
        const challenge = process.env.CHALLENGE || 'abc123';
        const domain = process.env.DOMAIN || 'https://example.com/';
        
        console.log(`Challenge: ${challenge}, Domain: ${domain}`);
        
        // **IMPORTANTE: Criar VP apenas uma vez**
        const vp = await createVerifiablePresentation({
            verifiableCredential,
            challenge,
            domain
        });
        
        console.log("✅ Verifiable Presentation created successfully");
        
        // Verificar quantas credenciais estão na VP final
        const vpCredentials = vp.verifiableCredential || [];
        console.log(`📊 Final VP contains ${vpCredentials.length} credential(s)`);
        
        if (Array.isArray(verifiableCredential)) {
            if (vpCredentials.length !== verifiableCredential.length) {
                console.warn(`⚠️ Mismatch: Expected ${verifiableCredential.length} credentials, got ${vpCredentials.length}`);
            } else {
                console.log(`✅ All ${verifiableCredential.length} credentials successfully included in VP`);
            }
        }
        
    } catch (error) {
        console.error("Error loading or processing credentials:", error);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

// Função para visualizar a nova credencial na aba "Credencial"
function viewNewCredential() {
    const certificationVC = localStorage.getItem('certificationVC');
    if (certificationVC) {
        const credential = JSON.parse(certificationVC);
        
        // Mudar para aba credencial
        showTab('credential');
        
        // Exibir a credencial certificada
        displayJSON('vc-display', credential);
        
        // Mostrar seção de criar VP
        const vpSection = document.getElementById('vp-creation-section');
        if (vpSection) {
            vpSection.style.display = 'block';
        }
        
        showNotification('📄 Credencial certificada carregada na aba Credencial', 'info');
    }
}

// Função para fazer download da credencial
function downloadCredential(holderName) {
    const certificationVC = localStorage.getItem('certificationVC');
    if (certificationVC) {
        const blob = new Blob([certificationVC], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${holderName.replace(/\s+/g, '_')}_certification_vc.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('📁 Credencial baixada com sucesso!', 'success');
    }
}

// Função para copiar JSON para área de transferência
async function copyToClipboard(base64Json) {
    try {
        const jsonString = atob(base64Json);
        await navigator.clipboard.writeText(jsonString);
        showNotification('📋 JSON copiado para área de transferência!', 'success');
    } catch (error) {
        console.error('Erro ao copiar:', error);
        showNotification('❌ Erro ao copiar JSON', 'error');
    }
}

// Função para mostrar notificações (se não existir ainda)
function showNotification(message, type = 'info', duration = 3000) {
    // Remover notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; font-size: 18px; cursor: pointer; margin-left: 10px;">&times;</button>
    `;
    
    // Adicionar ao body
    document.body.appendChild(notification);
    
    // Remover automaticamente após o tempo especificado
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, duration);
}