import express from 'express';
import path from 'path';
import { Issuer } from './issuer';
import { Holder } from './holder';
import { Verifier } from './verifier';
import { RevocationRegistry } from './revocation';
import FileStorage from './utils/fileStorage';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Instanciar file storage
const fileStorage = new FileStorage();
const revocationRegistry = new RevocationRegistry();
const issuer = new Issuer();
const holder = new Holder();
const verifier = new Verifier(revocationRegistry);

// Servir a página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Issue credential
app.post('/issue', async (req, res) => {
    try {
        const credential = await issuer.issueCredential(req.body.subject, req.body.type, req.body);
        const credentialId = credential.id || `credential-${Date.now()}`;
        
        // Adicionar ID se não existir
        credential.id = credentialId;
        
        // Salvar em ficheiro
        await fileStorage.saveCredential(credentialId, credential);
        
        res.json({ ...credential, storedId: credentialId, storage: 'file' });
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Get all credentials
app.get('/credentials', async (req, res) => {
    try {
        const credentials = await fileStorage.loadAllCredentials();
        const formattedCredentials = credentials.map(data => ({
            id: data.id,
            ...data.credential,
            preview: data.preview,
            savedAt: data.savedAt
        }));
        res.json(formattedCredentials);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Get specific credential
app.get('/credentials/:id', async (req, res) => {
    try {
        const data = await fileStorage.loadCredential(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Credential not found' });
        }
        res.json(data.credential);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Create presentation with selected credentials
app.post('/present', async (req, res) => {
    try {
        const { credentialIds, challenge, holderDid } = req.body;
        
        // Buscar credenciais selecionadas dos ficheiros
        const selectedCredentials = [];
        for (const id of credentialIds) {
            const data = await fileStorage.loadCredential(id);
            if (data) {
                selectedCredentials.push(data.credential);
            }
        }
        
        if (selectedCredentials.length === 0) {
            return res.status(400).json({ error: 'No valid credentials found' });
        }
        
        const presentation = await holder.createPresentation(selectedCredentials, challenge);
        const presentationId = presentation.id || `presentation-${Date.now()}`;
        
        // Adicionar ID se não existir
        presentation.id = presentationId;
        
        // Salvar em ficheiro
        await fileStorage.savePresentation(presentationId, presentation);
        
        res.json({ ...presentation, storedId: presentationId, storage: 'file' });
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Get all presentations
app.get('/presentations', async (req, res) => {
    try {
        const presentations = await fileStorage.loadAllPresentations();
        const formattedPresentations = presentations.map(data => ({
            id: data.id,
            ...data.presentation,
            preview: data.preview,
            savedAt: data.savedAt
        }));
        res.json(formattedPresentations);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Get specific presentation
app.get('/presentations/:id', async (req, res) => {
    try {
        const data = await fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        res.json(data.presentation);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Verify specific presentation
app.post('/verify/:id', async (req, res) => {
    try {
        const data = await fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        
        // Opções de verificação do corpo da requisição
        const verificationOptions = req.body || {};
        
        const result = await verifier.verify(data.presentation, verificationOptions);
        res.json({ 
            ...result, 
            source: 'file',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// Novo endpoint para verificação com contexto específico
app.post('/verify/:id/context', async (req, res) => {
    try {
        const data = await fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        
        const context = req.body;
        // Use the verify method with context as part of the options
        const result = await verifier.verify(data.presentation, { context });
        res.json({ 
            ...result, 
            source: 'file',
            context: context,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// Revoke presentation
app.post('/revoke/:id', async (req, res) => {
    try {
        const data = await fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        
        const result = revocationRegistry.revokePresentation({ presentationId: req.params.id });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Check revocation status
app.get('/check-revocation/:id', (req, res) => {
    try {
        const status = revocationRegistry.checkRevocation(req.params.id);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Delete credential
app.delete('/credentials/:id', async (req, res) => {
    try {
        const deleted = await fileStorage.deleteCredential(req.params.id);
        if (deleted) {
            res.json({ success: true, message: 'Credential deleted from file system' });
        } else {
            res.status(404).json({ error: 'Credential not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Delete presentation
app.delete('/presentations/:id', async (req, res) => {
    try {
        const deleted = await fileStorage.deletePresentation(req.params.id);
        if (deleted) {
            res.json({ success: true, message: 'Presentation deleted from file system' });
        } else {
            res.status(404).json({ error: 'Presentation not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Storage statistics
app.get('/storage/stats', (req, res) => {
    try {
        const stats = fileStorage.getStorageStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

// Create backup
app.post('/storage/backup', async (req, res) => {
    try {
        const backupPath = await fileStorage.createBackup();
        res.json({ 
            success: true, 
            message: 'Backup created successfully',
            backupPath: backupPath
        });
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`VC Demo server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Files stored in: data/ directory`);
});