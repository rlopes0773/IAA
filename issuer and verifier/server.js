import express from 'express';
import cors from 'cors';
import path from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Global storage for pending requests (use Redis/DB in production)
global.pendingRequests = {};

// Middleware
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('public'));

// Utility functions
const cleanupTempFiles = async (...files) => {
    for (const file of files) {
        try {
            await fs.unlink(file);
        } catch (error) {
            // Ignore cleanup errors
        }
    }
};

const parseSignedCredentialFromOutput = (stdout) => {
    const lines = stdout.split('\n');
    const vcLine = lines.find(line => line.startsWith('SIGNED_VC:'));
    
    if (!vcLine) {
        throw new Error('Falha ao obter credencial assinada do issuer');
    }
    
    const vcJson = vcLine.replace('SIGNED_VC:', '').trim();
    return JSON.parse(vcJson);
};

const parseVerificationResult = (stdout) => {
    const lines = stdout.split('\n');
    const resultLine = lines.find(line => line.includes('Verification result:'));
    
    if (!resultLine) {
        return { verified: false, error: 'No verification result found' };
    }
    
    try {
        const jsonStr = resultLine.replace('Verification result:', '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        return { verified: false, error: 'Failed to parse verification result' };
    }
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({
        hasCredential: false,
        message: 'Sistema Issuer/Verifier pronto (credenciais não são armazenadas pelo issuer)'
    });
});

// Issue personal data credential
app.post('/api/issue', async (req, res) => {
    try {
        const { id, name, birthDate, nationality } = req.body;
        
        // Validate required fields
        if (!id || !name || !birthDate || !nationality) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
        }

        // Create credential structure
        const credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "./contexts/personal-data-v1.json"
            ],
            "type": ["VerifiableCredential", "PersonalDataCredential"],
            "credentialSubject": { id, name, birthDate, nationality }
        };

        // Save to temporary file
        const tempFile = 'temp_credential.json';
        await fs.writeFile(tempFile, JSON.stringify(credential, null, 2));
        
        // Run issuer script
        const { stdout, stderr } = await execAsync(`node issuer.js ${tempFile}`);
        
        if (stderr) {
            console.error('Issuer stderr:', stderr);
        }

        // Parse result and cleanup
        const verifiableCredential = parseSignedCredentialFromOutput(stdout);
        await cleanupTempFiles(tempFile, 'vc.json');

        console.log('✅ Credencial emitida e enviada ao holder (não armazenada no issuer)');

        res.json({
            success: true,
            message: 'Credencial emitida com sucesso (não armazenada no issuer)',
            verifiableCredential,
            logs: stdout
        });

    } catch (error) {
        console.error('Error in /api/issue:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Verify presentation
app.post('/api/verify', async (req, res) => {
    try {
        const { challenge, domain, presentation } = req.body;
        
        if (!presentation) {
            return res.status(400).json({
                success: false,
                error: 'Nenhuma apresentação fornecida'
            });
        }

        // Write presentation to temp file
        const tempFile = 'temp_vp.json';
        await fs.writeFile(tempFile, JSON.stringify(presentation, null, 2));

        // Set environment variables and run verifier
        process.env.VERIFY_CHALLENGE = challenge;
        process.env.VERIFY_DOMAIN = domain;
        process.env.VP_FILE = tempFile;

        console.log('Running verifier with:', { challenge, domain });

        const { stdout, stderr } = await execAsync('node verifier.js');
        
        if (stderr) {
            console.error('Verifier stderr:', stderr);
        }

        // Parse result and cleanup
        const verificationResult = parseVerificationResult(stdout);
        const verified = verificationResult.verified === true;
        await cleanupTempFiles(tempFile);

        res.json({
            success: true,
            message: verified ? 'Apresentação verificada com sucesso' : 'Falha na verificação',
            verified,
            verificationResult,
            logs: stdout
        });

    } catch (error) {
        console.error('Error in /api/verify:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Request certification with challenge
app.post('/api/request-certification', async (req, res) => {
    try {
        const { degreeName, institution, finalGrade, graduationDate } = req.body;
        
        if (!degreeName || !institution || !finalGrade || !graduationDate) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
        }

        // Generate unique challenge and request ID
        const challenge = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const domain = 'https://issuer.example.com';
        const requestId = `req-${Date.now()}`;

        // Store request temporarily (5 minutes expiry)
        global.pendingRequests[requestId] = {
            challenge,
            domain,
            degreeName,
            institution,
            finalGrade,
            graduationDate,
            timestamp: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000)
        };

        console.log(`🔐 Challenge gerado para certificação: ${challenge}`);

        res.json({
            success: true,
            message: 'Challenge gerado. Envie uma VP com seus dados pessoais para autenticação.',
            requestId,
            challenge,
            domain,
            nextStep: '/api/authenticate-and-issue'
        });

    } catch (error) {
        console.error('Error in /api/request-certification:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Authenticate via VP and issue certification
app.post('/api/authenticate-and-issue', async (req, res) => {
    try {
        const { requestId, presentation } = req.body;
        
        if (!requestId || !presentation) {
            return res.status(400).json({
                success: false,
                error: 'requestId e presentation são obrigatórios'
            });
        }

        // Retrieve and validate pending request
        const pendingRequest = global.pendingRequests[requestId];
        
        if (!pendingRequest) {
            return res.status(400).json({
                success: false,
                error: 'Solicitação não encontrada ou expirada'
            });
        }

        if (Date.now() > pendingRequest.expiresAt) {
            delete global.pendingRequests[requestId];
            return res.status(400).json({
                success: false,
                error: 'Solicitação expirada. Inicie um novo processo.'
            });
        }

        // Verify the VP with challenge
        const tempAuthFile = 'temp_auth_vp.json';
        await fs.writeFile(tempAuthFile, JSON.stringify(presentation, null, 2));

        process.env.VERIFY_CHALLENGE = pendingRequest.challenge;
        process.env.VERIFY_DOMAIN = pendingRequest.domain;
        process.env.VP_FILE = tempAuthFile;

        console.log('🔍 Verificando autenticação com challenge:', pendingRequest.challenge);

        const { stdout, stderr } = await execAsync('node verifier.js');
        
        if (stderr) {
            console.error('Verifier stderr:', stderr);
        }

        // Parse verification result
        const verificationResult = parseVerificationResult(stdout);
        const verified = verificationResult.verified === true;
        
        await cleanupTempFiles(tempAuthFile);

        if (!verified) {
            return res.status(401).json({
                success: false,
                error: 'Falha na autenticação. VP inválida ou challenge incorreto.',
                verificationDetails: verificationResult
            });
        }

        // Extract holder identity
        const holderDid = presentation.holder;
        const credentialSubject = presentation.verifiableCredential[0]?.credentialSubject;
        
        if (!credentialSubject?.name) {
            return res.status(400).json({
                success: false,
                error: 'Dados pessoais não encontrados na VP'
            });
        }

        console.log(`✅ Autenticação bem-sucedida para ${credentialSubject.name} (${holderDid})`);

        // Create UNIVERSITY DEGREE credential (apenas certificado académico)
        const credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "./contexts/university-degree-v1.json"
            ],
            "type": ["VerifiableCredential", "UniversityDegreeCredential"],
            "credentialSubject": {
                "id": holderDid,
                "studentName": credentialSubject.name,
                "degreeName": pendingRequest.degreeName,
                "institution": pendingRequest.institution,
                "finalGrade": pendingRequest.finalGrade,
                "graduationDate": pendingRequest.graduationDate
            }
        };

        // Issue university degree credential
        const tempCertFile = 'temp_degree_credential.json';
        await fs.writeFile(tempCertFile, JSON.stringify(credential, null, 2));
        
        const { stdout: issuerStdout, stderr: issuerStderr } = await execAsync(`node issuer.js ${tempCertFile} university-degree`);
        
        if (issuerStderr) {
            console.error('Issuer stderr:', issuerStderr);
        }

        // Parse and cleanup
        const verifiableCredential = parseSignedCredentialFromOutput(issuerStdout);
        await cleanupTempFiles(tempCertFile);
        delete global.pendingRequests[requestId];

        console.log('✅ Certificado universitário emitido após autenticação bem-sucedida');

        res.json({
            success: true,
            message: `Certificado universitário emitido para ${credentialSubject.name}`,
            verifiableCredential,
            authenticationDetails: {
                holderName: credentialSubject.name,
                holderDid,
                challenge: pendingRequest.challenge,
                verified: true,
                certificationType: "University Degree Certificate"
            }
        });

    } catch (error) {
        console.error('Error in /api/authenticate-and-issue:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Servidor Issuer/Verifier rodando em http://localhost:${PORT}`);
    console.log(`📱 Abra o navegador e acesse a interface web`);
});