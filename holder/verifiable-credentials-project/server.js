import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get existing files
app.get('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, filename);
    
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        res.json(JSON.parse(data));
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// API endpoint to list available contexts
app.get('/api/contexts', (req, res) => {
    try {
        const contextsDir = path.join(__dirname, 'contexts');
        
        if (!fs.existsSync(contextsDir)) {
            return res.json({ 
                contexts: [],
                message: 'Contexts directory not found'
            });
        }
        
        const contextFiles = fs.readdirSync(contextsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(contextsDir, file);
                try {
                    const contextData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    return {
                        filename: file,
                        name: file.replace('.json', ''),
                        hasContext: !!contextData['@context'],
                        size: fs.statSync(filePath).size
                    };
                } catch (error) {
                    return {
                        filename: file,
                        name: file.replace('.json', ''),
                        error: 'Invalid JSON',
                        size: fs.statSync(filePath).size
                    };
                }
            });
        
        res.json({ 
            contexts: contextFiles,
            total: contextFiles.length
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to list contexts',
            details: error.message 
        });
    }
});

// API endpoint to save uploaded credential
app.post('/api/save-credential', (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ error: 'No credential data provided' });
        }
        
        const filePath = path.join(__dirname, 'vc.json');
        fs.writeFileSync(filePath, JSON.stringify(credential, null, 2));
        
        res.json({ 
            message: 'Credential saved successfully',
            filename: 'vc.json',
            contexts: credential['@context'] || []
        });
        
    } catch (error) {
        console.error('Error saving credential:', error);
        res.status(500).json({ 
            error: 'Failed to save credential',
            details: error.message 
        });
    }
});

// API endpoint to create presentation
app.post('/api/create-presentation', async (req, res) => {
    try {
        const { challenge, domain, holderDid } = req.body;
        
        console.log('Creating presentation with params:', { challenge, domain, holderDid });
        
        // Check if vc.json exists
        const vcPath = path.join(__dirname, 'vc.json');
        if (!fs.existsSync(vcPath)) {
            return res.status(400).json({ 
                error: 'vc.json not found. Please upload a credential first.',
                details: 'The credential file does not exist on the server.'
            });
        }

        // Verify vc.json is valid JSON and check contexts
        try {
            const vcContent = fs.readFileSync(vcPath, 'utf8');
            const credential = JSON.parse(vcContent);
            console.log('Credential contexts:', credential['@context']);
        } catch (jsonError) {
            return res.status(400).json({
                error: 'Invalid vc.json file',
                details: 'The credential file is not valid JSON: ' + jsonError.message
            });
        }

        // Check if contexts directory exists
        const contextsDir = path.join(__dirname, 'contexts');
        if (!fs.existsSync(contextsDir)) {
            console.warn('Contexts directory not found, creating it...');
            fs.mkdirSync(contextsDir, { recursive: true });
        }

        let holderPath = 'holder.js';

        // Execute holder script
        const createPresentation = new Promise((resolve, reject) => {
            const env = {
                ...process.env,
                CHALLENGE: challenge,
                DOMAIN: domain
            };

            if (holderDid) {
                env.HOLDER_DID = holderDid;
            }

            console.log('Starting holder process with env:', { CHALLENGE: challenge, DOMAIN: domain, HOLDER_DID: holderDid });

            const child = spawn('node', [holderPath], {
                env,
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log('STDOUT:', data.toString());
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
                console.error('STDERR:', data.toString());
            });

            child.on('close', (code) => {
                console.log(`Process exited with code: ${code}`);
                
                if (code === 0) {
                    try {
                        const vpPath = path.join(__dirname, 'vp.json');
                        if (fs.existsSync(vpPath)) {
                            const vp = JSON.parse(fs.readFileSync(vpPath, 'utf8'));
                            resolve({
                                message: 'Presentation created successfully',
                                presentation: vp,
                                stdout,
                                files: {
                                    vp: 'vp.json',
                                    keyPair: 'vpEcdsaKeyPair.json'
                                }
                            });
                        } else {
                            reject(new Error('vp.json was not created by the holder script'));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to read vp.json: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Holder script failed with exit code ${code}. Error output: ${stderr}`));
                }
            });

            child.on('error', (error) => {
                console.error('Process error:', error);
                reject(new Error(`Failed to start holder process: ${error.message}`));
            });
        });

        const result = await createPresentation;
        res.json(result);
        
    } catch (error) {
        console.error('Error creating presentation:', error);
        res.status(500).json({ 
            error: 'Failed to create presentation',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Working directory: ${__dirname}`);
    
    // Check for required files and directories on startup
    const contextsDir = path.join(__dirname, 'contexts');
    if (fs.existsSync(contextsDir)) {
        const contextFiles = fs.readdirSync(contextsDir).filter(f => f.endsWith('.json'));
        console.log(`📄 Found ${contextFiles.length} context files:`, contextFiles);
    } else {
        console.log('📄 Contexts directory not found - will create when needed');
    }
});