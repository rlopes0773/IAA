import express from 'express';
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

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.post('/api/issue', async (req, res) => {
    try {
        const { studentId, studentName, degreeName, finalGrade, graduationDate, institution } = req.body;
        
        // Validate required fields
        if (!studentId || !studentName || !degreeName || !finalGrade || !graduationDate || !institution) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
        }

        // Validate grade range
        const grade = parseFloat(finalGrade);
        if (grade < 0 || grade > 20) {
            return res.status(400).json({
                success: false,
                error: 'A nota final deve estar entre 0 e 20'
            });
        }

        // Create enhanced credential with custom context
        const credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://www.w3.org/2018/credentials/examples/v1",
                "https://example.org/contexts/university-degree/v1"
            ],
            "type": ["VerifiableCredential", "UniversityDegreeCredential"],
            "credentialSubject": {
                "id": studentId,
                "name": studentName,
                "degree": {
                    "type": "BachelorDegree",
                    "name": degreeName,
                    "finalGrade": grade,
                    "graduationDate": graduationDate,
                    "institution": institution,
                    "gradeScale": "0-20"
                }
            }
        };

        await fs.writeFile('credential.json', JSON.stringify(credential, null, 2));
        
        // Run issuer script
        const { stdout, stderr } = await execAsync('node issuer.js');
        
        if (stderr) {
            console.error('Issuer stderr:', stderr);
        }

        // Read the generated VC
        const vcData = await fs.readFile('vc.json', 'utf8');
        const verifiableCredential = JSON.parse(vcData);

        res.json({
            success: true,
            message: 'Credencial emitida com sucesso',
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

app.post('/api/verify', async (req, res) => {
    try {
        const { challenge, domain, presentation } = req.body;
        
        // Check if presentation is provided in request
        if (!presentation) {
            return res.status(400).json({
                success: false,
                error: 'Nenhuma apresentação fornecida. Envie a apresentação no corpo da requisição.'
            });
        }

        // Write presentation to temp file for verifier
        const vpData = JSON.stringify(presentation, null, 2);
        await fs.writeFile('temp_vp.json', vpData);

        // Set environment variables for verifier script
        process.env.VERIFY_CHALLENGE = challenge;
        process.env.VERIFY_DOMAIN = domain;
        process.env.VP_FILE = 'temp_vp.json';

        console.log('Running verifier with:', { challenge, domain });

        // Run verifier script
        const { stdout, stderr } = await execAsync('node verifier.js');
        
        if (stderr) {
            console.error('Verifier stderr:', stderr);
        }

        // Clean up temp file
        try {
            await fs.unlink('temp_vp.json');
        } catch {}

        // Parse verification result from stdout
        const output = stdout.trim();
        const lines = output.split('\n');
        const resultLine = lines.find(line => line.includes('Verification result:'));
        
        let verified = false;
        let verificationResult = {};

        if (resultLine) {
            try {
                const jsonStr = resultLine.replace('Verification result:', '').trim();
                verificationResult = JSON.parse(jsonStr);
                verified = verificationResult.verified === true;
            } catch (parseError) {
                console.error('Error parsing verification result:', parseError);
            }
        }

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

app.get('/api/status', async (req, res) => {
    try {
        const status = {
            hasCredential: false,
            message: 'Sistema Issuer/Verifier pronto'
        };

        try {
            await fs.access('vc.json');
            status.hasCredential = true;
            status.message = 'Credencial disponível para verificação';
        } catch {}

        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Issuer/Verifier rodando em http://localhost:${PORT}`);
    console.log(`📱 Abra o navegador e acesse a interface web`);
});