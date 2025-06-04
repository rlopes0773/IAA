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

// Initialize components
const fileStorage = new FileStorage();
const revocationRegistry = new RevocationRegistry();
const issuer = new Issuer();
const holder = new Holder();
const verifier = new Verifier(revocationRegistry);

// Middleware for error handling
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Issue credential with Digital Bazaar
app.post('/issue', asyncHandler(async (req: any, res: any) => {
    try {
        console.log('Issuing credential with Digital Bazaar...');
        
        const credential = await issuer.issueCredential(
            req.body.subject, 
            req.body.type, 
            req.body
        );
        
        const credentialId = credential.id || `credential-${Date.now()}`;
        credential.id = credentialId;
        
        // Save to file
        await fileStorage.saveCredential(credentialId, credential);
        
        res.json({ 
            ...credential, 
            storedId: credentialId, 
            storage: 'file',
            cryptographicallySigned: true,
            signatureMethod: 'Digital Bazaar Data Integrity'
        });
        
    } catch (error) {
        console.error('Error issuing credential:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            details: 'Failed to issue credential with Digital Bazaar signature'
        });
    }
}));

// Get all credentials
app.get('/credentials', asyncHandler(async (req: any, res: any) => {
    const credentials = await fileStorage.loadAllCredentials();
    const formattedCredentials = credentials.map(data => ({
        id: data.id,
        ...data.credential,
        preview: data.preview,
        savedAt: data.savedAt
    }));
    res.json(formattedCredentials);
}));

// Get specific credential
app.get('/credentials/:id', asyncHandler(async (req: any, res: any) => {
    const data = await fileStorage.loadCredential(req.params.id);
    if (!data) {
        return res.status(404).json({ error: 'Credential not found' });
    }
    res.json(data.credential);
}));

// Create presentation with Digital Bazaar
app.post('/present', asyncHandler(async (req: any, res: any) => {
    try {
        const { credentialIds, challenge, holderDid } = req.body;
        
        console.log('Creating presentation with Digital Bazaar...');
        
        // Load selected credentials
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
        
        const presentation = await holder.createPresentation(
            selectedCredentials, 
            challenge, 
            holderDid
        );
        
        const presentationId = presentation.id || `presentation-${Date.now()}`;
        presentation.id = presentationId;
        
        // Save to file
        await fileStorage.savePresentation(presentationId, presentation);
        
        res.json({ 
            ...presentation, 
            storedId: presentationId, 
            storage: 'file',
            cryptographicallySigned: true,
            signatureMethod: 'Digital Bazaar Data Integrity'
        });
        
    } catch (error) {
        console.error('Error creating presentation:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            details: 'Failed to create presentation with Digital Bazaar signature'
        });
    }
}));

// Get all presentations
app.get('/presentations', asyncHandler(async (req: any, res: any) => {
    const presentations = await fileStorage.loadAllPresentations();
    const formattedPresentations = presentations.map(data => ({
        id: data.id,
        ...data.presentation,
        preview: data.preview,
        savedAt: data.savedAt
    }));
    res.json(formattedPresentations);
}));

// Get specific presentation
app.get('/presentations/:id', asyncHandler(async (req: any, res: any) => {
    const data = await fileStorage.loadPresentation(req.params.id);
    if (!data) {
        return res.status(404).json({ error: 'Presentation not found' });
    }
    res.json(data.presentation);
}));

// Verify presentation with Digital Bazaar
app.post('/verify/:id', asyncHandler(async (req: any, res: any) => {
    try {
        const data = await fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        
        console.log('Verifying presentation with Digital Bazaar...');
        
        const verificationOptions = req.body || {};
        const result = await verifier.verify(data.presentation, verificationOptions);
        
        res.json({ 
            ...result, 
            source: 'file',
            timestamp: new Date().toISOString(),
            verificationMethod: 'Digital Bazaar Cryptographic Verification'
        });
        
    } catch (error) {
        console.error('Error verifying presentation:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : String(error),
            details: 'Failed to verify presentation with Digital Bazaar'
        });
    }
}));

// Verify with context
app.post('/verify/:id/context', asyncHandler(async (req: any, res: any) => {
    const data = await fileStorage.loadPresentation(req.params.id);
    if (!data) {
        return res.status(404).json({ error: 'Presentation not found' });
    }
    
    const context = req.body;
    const result = await verifier.verify(data.presentation, { context });
    
    res.json({ 
        ...result, 
        source: 'file',
        context: context,
        timestamp: new Date().toISOString(),
        verificationMethod: 'Digital Bazaar Cryptographic Verification with Context'
    });
}));

// Revoke presentation
app.post('/revoke/:id', asyncHandler(async (req: any, res: any) => {
    const data = await fileStorage.loadPresentation(req.params.id);
    if (!data) {
        return res.status(404).json({ error: 'Presentation not found' });
    }
    
    const result = revocationRegistry.revokePresentation({ presentationId: req.params.id });
    res.json(result);
}));

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
app.delete('/credentials/:id', asyncHandler(async (req: any, res: any) => {
    const deleted = await fileStorage.deleteCredential(req.params.id);
    if (deleted) {
        res.json({ success: true, message: 'Credential deleted from file system' });
    } else {
        res.status(404).json({ error: 'Credential not found' });
    }
}));

// Delete presentation
app.delete('/presentations/:id', asyncHandler(async (req: any, res: any) => {
    const deleted = await fileStorage.deletePresentation(req.params.id);
    if (deleted) {
        res.json({ success: true, message: 'Presentation deleted from file system' });
    } else {
        res.status(404).json({ error: 'Presentation not found' });
    }
}));

// Storage management endpoints
app.get('/storage/stats', (req, res) => {
    try {
        const stats = fileStorage.getStorageStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});

app.post('/storage/backup', asyncHandler(async (req: any, res: any) => {
    const backupPath = await fileStorage.createBackup();
    res.json({ 
        success: true, 
        message: 'Backup created successfully',
        backupPath: backupPath
    });
}));

// Global error handler
app.use((error: any, req: any, res: any, next: any) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 VC Demo server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
    console.log(`💾 Files stored in: data/ directory`);
    console.log(`🔐 Using Digital Bazaar cryptographic verification`);
});